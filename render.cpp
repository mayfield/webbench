// derived from smallpt, a Path Tracer by Kevin Beason, 2008
#include <math.h>
#include <stdlib.h>
#include <stdio.h>


/* Quake's fast inverse square (64bit version) for fun */
float Q_rsqrt64(double number) {
	long long i;
	double x2, y;
	const double threehalfs = 1.5F;

	x2 = number * 0.5F;
	y  = number;
	i  = *(long long *) &y;                 // evil floating point bit level hacking
	i  = 0x5fe6eb50c7b537a9 - (i >> 1);     // what the fuck? 
	y  = *(double *) &i;
	y  = y * (threehalfs - (x2 * y * y));   // 1st iteration
//	y  = y * (threehalfs - (x2 * y * y));   // 2nd iteration, this can be removed

	return y;
}


struct Vec {
    double x, y, z; // position, also color (r,g,b)
    Vec(double x_=0, double y_=0, double z_=0) {
        x=x_;
        y=y_;
        z=z_;
    }
    Vec operator + (const Vec &b) const {
        return Vec(x + b.x, y + b.y, z + b.z);
    }
    Vec operator - (const Vec &b) const {
        return Vec(x - b.x, y - b.y, z - b.z);
    }
    Vec operator * (double b) const {
        return Vec(x * b, y * b, z * b);
    }
    Vec operator % (Vec &b) {
        return Vec(y * b.z - z * b.y, z * b.x - x * b.z, x * b.y - y * b.x);
    }
    Vec mult(const Vec &b) const {
        return Vec(x * b.x, y * b.y, z * b.z);
    }
    Vec& norm() {
        return *this = *this * (1 / sqrt(x * x + y * y + z * z));
    }
    double dot(const Vec &b) const {
        return x * b.x + y * b.y + z * b.z; // cross:
    }
};

struct Ray {
    Vec o, d;
    Ray(Vec o_, Vec d_) : o(o_), d(d_) {}
};

enum Refl_t { DIFF, SPEC, REFR };  // material types, used in radiance()

struct Sphere {
    double rad;       // radius
    Vec p, e, c;      // position, emission, color
    Refl_t refl;      // reflection type (DIFFuse, SPECular, REFRactive)
    Sphere(double rad_, Vec p_, Vec e_, Vec c_, Refl_t refl_):
        rad(rad_), p(p_), e(e_), c(c_), refl(refl_) {}
    double intersect(const Ray &r) const { // returns distance, 0 if nohit
        Vec op = p-r.o; // Solve t^2*d.d + 2*t*(o-p).d + (o-p).(o-p)-R^2 = 0
        double t, eps=1e-4, b=op.dot(r.d), det=b*b-op.dot(op)+rad*rad;
        if (det<0) return 0; else det=sqrt(det);
        return (t=b-det)>eps ? t : ((t=b+det)>eps ? t : 0);
    }
};


Sphere spheres[] = { //Scene: radius, position, emission, color, material
    Sphere(1e5, Vec( 1e5+1,40.8,81.6), Vec(),Vec(.75,.25,.25),DIFF),//Left
    Sphere(1e5, Vec(-1e5+99,40.8,81.6),Vec(),Vec(.25,.25,.75),DIFF),//Rght
    Sphere(1e5, Vec(50,40.8, 1e5),     Vec(),Vec(.75,.75,.75),DIFF),//Back
    Sphere(1e5, Vec(50,40.8,-1e5+170), Vec(),Vec(),           DIFF),//Frnt
    Sphere(1e5, Vec(50, 1e5, 81.6),    Vec(),Vec(.75,.75,.75),DIFF),//Botm
    Sphere(1e5, Vec(50,-1e5+81.6,81.6),Vec(),Vec(.75,.75,.75),DIFF),//Top
    Sphere(16.5,Vec(27,16.5,47),       Vec(),Vec(1,1,1)*.999, SPEC),//Mirr
    Sphere(16.5,Vec(73,16.5,78),       Vec(),Vec(1,1,1)*.999, REFR),//Glas
    Sphere(600, Vec(50,681.6-.27,81.6),Vec(12,12,12),  Vec(), DIFF) //Lite
};


inline double clamp(double x) {
    return x < 0 ? 0 : x > 1 ? 1 : x;
}


inline unsigned char toByte(double x) {
    return (unsigned char) (pow(clamp(x), 1 / 2.2) * 255 + 0.5);
}


inline bool intersect(const Ray &r, double &t, int &id) {
    double n=sizeof(spheres)/sizeof(Sphere), d, inf=t=1e20;
    for(int i=int(n);i--;) if((d=spheres[i].intersect(r))&&d<t){t=d;id=i;}
    return t<inf;
}


Vec radiance_iterative(const Ray &r_, int depth_, unsigned short *Xi){
    double t; // distance to intersection
    int id = 0; // id of intersected object
    Ray r = r_;
    int depth = depth_;
    Vec cl(0, 0, 0); // accumulated color
    Vec cf(1, 1, 1); // accumulated reflectance
    while (1) {
        if (!intersect(r, t, id)) {
            return cl; // if miss, return black
        }
        const Sphere &obj = spheres[id]; // the hit object
        Vec x = r.o + r.d * t;
        Vec n = (x-obj.p).norm();
        Vec nl = n.dot(r.d) < 0 ? n : n * -1;
        Vec f = obj.c;
        double p = f.x > f.y && f.x > f.z ? f.x : f.y > f.z ? f.y : f.z; // max refl
        cl = cl + cf.mult(obj.e);
        if (++depth > 5) {
            if (erand48(Xi) < p) {
                f = f * (1 / p);
            } else {
                return cl; //R.R.
            }
        }
        cf = cf.mult(f);
        if (obj.refl == DIFF) { // Ideal DIFFUSE reflection
            double r1 = 2 * M_PI * erand48(Xi);
            double r2 = erand48(Xi);
            double r2s = sqrt(r2);
            Vec w = nl;
            Vec u = ((fabs(w.x) > 0.1 ? Vec(0, 1) : Vec(1)) % w).norm();
            Vec v = w % u;
            Vec d = (u * cos(r1) * r2s + v * sin(r1) * r2s + w * sqrt(1 - r2)).norm();
            // Ported from: return obj.e + f.mult(radiance_recursive(Ray(x,d),depth,Xi));
            r = Ray(x, d);
            continue;
        } else if (obj.refl == SPEC) { // Ideal SPECULAR reflection
            // Ported from: return obj.e + f.mult(radiance_recursive(Ray(x,r.d-n*2*n.dot(r.d)),depth,Xi));
            r = Ray(x, r.d - n * 2 * n.dot(r.d));
            continue;
        }
        Ray reflRay(x, r.d - n * 2 * n.dot(r.d)); // Ideal dielectric REFRACTION
        bool into = n.dot(nl) > 0; // Ray from outside going in?
        double nc = 1;
        double nt = 1.5;
        double nnt = into ? nc / nt : nt / nc;
        double ddn = r.d.dot(nl);
        double cos2t;
        if ((cos2t = 1 - nnt * nnt * (1 - ddn * ddn)) < 0) { // Total internal reflection
            // Ported from: return obj.e + f.mult(radiance_recursive(reflRay,depth,Xi));
            r = reflRay;
            continue;
        }
        Vec tdir = (r.d * nnt - n * ((into ? 1 : -1) * (ddn * nnt + sqrt(cos2t)))).norm();
        double a = nt - nc;
        double b = nt + nc;
        double R0 = a * a / (b * b);
        double c = 1 - (into ? -ddn : tdir.dot(n));
        double Re = R0 + (1 - R0) * c * c * c * c * c;
        double Tr = 1 - Re;
        double P = 0.25 + 0.5 * Re;
        double RP = Re / P;
        double TP = Tr / (1 - P);
        // Ported from...
        // return obj.e + f.mult(erand48(Xi)<P ?
        //     radiance_recursive(reflRay,    depth,Xi)*RP:
        //     radiance_recursive(Ray(x,tdir),depth,Xi)*TP);
        if (erand48(Xi)<P){
            cf = cf * RP;
            r = reflRay;
        } else {
            cf = cf * TP;
            r = Ray(x, tdir);
        }
        continue;
    }
}


Vec radiance_recursive(const Ray &r, int depth, unsigned short *Xi) {
    double t; // distance to intersection
    int id = 0; // id of intersected object
    if (!intersect(r, t, id)) return Vec(); // if miss, return black
    const Sphere &obj = spheres[id]; // the hit object
    Vec x=r.o+r.d*t, n=(x-obj.p).norm(), nl=n.dot(r.d)<0?n:n*-1, f=obj.c;
    double p = f.x > f.y && f.x > f.z ? f.x : f.y > f.z ? f.y : f.z; // max refl
    if (++depth>5) {
        if (erand48(Xi) < p) {
            f = f * (1/p);
        } else {
            return obj.e; //R.R.
        }
    }
    if (obj.refl == DIFF) { // Ideal DIFFUSE reflection
        double r1=2*M_PI*erand48(Xi), r2=erand48(Xi), r2s=sqrt(r2);
        Vec w=nl, u = ((fabs(w.x) > 0.1 ? Vec(0,1) : Vec(1)) % w).norm(), v = w%u;
        Vec d = (u * cos(r1) * r2s + v * sin(r1) * r2s + w * sqrt(1-r2)).norm();
        return obj.e + f.mult(radiance_recursive(Ray(x, d), depth, Xi));
    } else if (obj.refl == SPEC) { // Ideal SPECULAR reflection
        return obj.e + f.mult(radiance_recursive(Ray(x, r.d - n * 2 * n.dot(r.d)), depth, Xi));
    }
    Ray reflRay(x, r.d - n * 2 * n.dot(r.d)); // Ideal dielectric REFRACTION
    bool into = n.dot(nl) > 0; // Ray from outside going in?
    double nc=1, nt=1.5, nnt = into ? nc / nt : nt / nc, ddn = r.d.dot(nl), cos2t;
    if ((cos2t = 1 - nnt * nnt * (1 - ddn * ddn)) < 0) { // Total internal reflection
        return obj.e + f.mult(radiance_recursive(reflRay, depth, Xi));
    }
    Vec tdir = (r.d * nnt - n * ((into ? 1 : -1) * (ddn * nnt + sqrt(cos2t)))).norm();
    double a = nt - nc;
    double b = nt + nc;
    double R0 = (a * a) / (b * b);
    double c = 1 - (into ? -ddn : tdir.dot(n));
    double Re = R0 + (1 - R0) * c * c * c * c * c;
    double Tr = 1 - Re;
    double P = 0.25 + 0.5 * Re;
    double RP = Re / P;
    double TP = Tr / (1 - P);
    return obj.e + f.mult(depth > 2 ? (erand48(Xi) < P ? // Russian roulette
        radiance_recursive(reflRay,depth, Xi) * RP : radiance_recursive(Ray(x, tdir), depth, Xi) * TP) :
        radiance_recursive(reflRay,depth, Xi) * Re + radiance_recursive(Ray(x, tdir), depth, Xi) * Tr);
}


static int imgWidth = 1024;
static int imgHeight = 768;
static Ray cam(Vec(50, 52, 295.6), Vec(0, -0.042612, -1).norm()); // cam pos, dir
static Vec cx = Vec(imgWidth * 0.5135 / imgHeight);
static Vec cy = (cx % cam.d).norm() * 0.5135;


extern "C" {

unsigned char *renderBlock(int samples, int xStart, int yStart, int width, int height) {
    Vec r;
    Vec *block = new Vec[width * height];
    for (int y = imgHeight - yStart - 1, yi = 0; y >= imgHeight - yStart - 1 - height; y--, yi++) {
        unsigned short Xi[3] = {0, 0, (unsigned short) (y * y * y)};
        for (int x = xStart, xi = 0; x < xStart + width; x++, xi++) {
            int ii = yi * width + xi;
            for (int sy = 0; sy < 2; sy++) {
                // 2x2 subpixel rows
                for (int sx = 0; sx < 2; sx++, r = Vec()) { // 2x2 subpixel cols
                    for (int s = 0; s < samples; s++) {
                        double r1 = 2 * erand48(Xi), dx = r1 < 1 ? sqrt(r1) - 1 : 1 - sqrt(2-r1);
                        double r2 = 2 * erand48(Xi), dy = r2 < 1 ? sqrt(r2) - 1 : 1 - sqrt(2-r2);
                        Vec d = cx * (((sx + 0.5 + dx) / 2 + x) / imgWidth - 0.5) +
                                cy * (((sy + 0.5 + dy) / 2 + y) / imgHeight - 0.5) + cam.d;
                        r = r + radiance_iterative(Ray(cam.o + d * 140, d.norm()), 0, Xi) * (1.0 / samples);
                    } // Camera rays are pushed ^^^^^ forward to start in interior
                    block[ii] = block[ii] + Vec(clamp(r.x), clamp(r.y), clamp(r.z)) * 0.25;
                }
            }
        }
    }
    unsigned char *bmp = (unsigned char*) malloc(width * height * 3);
    int c = 0;
    for (int i = 0; i < width * height; i++) {
        bmp[c++] = toByte(block[i].x);
        bmp[c++] = toByte(block[i].y);
        bmp[c++] = toByte(block[i].z);
    }
    return bmp;
}

} // extern C
