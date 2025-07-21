-- CreateTable
CREATE TABLE "UserExtras" (
    "uid" BIGINT NOT NULL,
    "department" TEXT,
    "division" TEXT,
    "photo" TEXT,

    CONSTRAINT "UserExtras_pkey" PRIMARY KEY ("uid")
);

-- AddForeignKey
ALTER TABLE "UserExtras" ADD CONSTRAINT "UserExtras_uid_fkey" FOREIGN KEY ("uid") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;
