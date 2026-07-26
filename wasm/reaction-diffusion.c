#include <stdlib.h>
#include <string.h>

#define DA 1.0f
#define DB 0.5f

static int g_width = 0;
static int g_height = 0;
static float *g_gridA = NULL;
static float *g_gridB = NULL;
static float *g_nextA = NULL;
static float *g_nextB = NULL;

void init(int width, int height, float seed) {
    if (g_gridA) free(g_gridA);
    if (g_gridB) free(g_gridB);
    if (g_nextA) free(g_nextA);
    if (g_nextB) free(g_nextB);

    g_width = width;
    g_height = height;
    int size = width * height;

    g_gridA = (float*)malloc(size * sizeof(float));
    g_gridB = (float*)malloc(size * sizeof(float));
    g_nextA = (float*)malloc(size * sizeof(float));
    g_nextB = (float*)malloc(size * sizeof(float));

    for (int i = 0; i < size; i++) {
        g_gridA[i] = 1.0f;
        g_gridB[i] = 0.0f;
    }
}

static float laplacian(float *grid, int x, int y, int w, int h) {
    int xm = (x > 0) ? x - 1 : w - 1;
    int xp = (x < w - 1) ? x + 1 : 0;
    int ym = (y > 0) ? y - 1 : h - 1;
    int yp = (y < h - 1) ? y + 1 : 0;

    float c = grid[y * w + x];

    return
        grid[ym * w + xm] * 0.2f +
        grid[ym * w + x]  * 0.05f +
        grid[ym * w + xp] * 0.2f +
        grid[y  * w + xm] * 0.05f +
        -c +
        grid[y  * w + xp] * 0.05f +
        grid[yp * w + xm] * 0.2f +
        grid[yp * w + x]  * 0.05f +
        grid[yp * w + xp] * 0.2f;
}

void step(float feed, float kill, int iterations) {
    if (!g_gridA || !g_gridB) return;

    int w = g_width;
    int h = g_height;

    for (int iter = 0; iter < iterations; iter++) {
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int idx = y * w + x;
                float a = g_gridA[idx];
                float b = g_gridB[idx];

                float lapA = laplacian(g_gridA, x, y, w, h);
                float lapB = laplacian(g_gridB, x, y, w, h);

                float abb = a * b * b;

                g_nextA[idx] = a + (DA * lapA - abb + feed * (1.0f - a));
                g_nextB[idx] = b + (DB * lapB + abb - (feed + kill) * b);
            }
        }

        float *tmpA = g_gridA;
        g_gridA = g_nextA;
        g_nextA = tmpA;

        float *tmpB = g_gridB;
        g_gridB = g_nextB;
        g_nextB = tmpB;
    }
}

float* getA() {
    return g_gridA;
}

float* getB() {
    return g_gridB;
}

int getWidth() {
    return g_width;
}

int getHeight() {
    return g_height;
}
