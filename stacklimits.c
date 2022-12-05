#include <stdio.h>

void recurseHere(int cnt)
{
    if (cnt % 100 == 0)
        printf("recurseHere: %d\n", cnt);
    recurseHere(++cnt);
}

int main()
{
    recurseHere(0);
    return 0;
}
