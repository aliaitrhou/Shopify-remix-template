-- CreateTable
CREATE TABLE "MetafieldLog" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shop" TEXT NOT NULL,

    CONSTRAINT "MetafieldLog_pkey" PRIMARY KEY ("id")
);
