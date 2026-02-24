CREATE TABLE "Mission" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "icon_key" TEXT NOT NULL,
  "color_hex" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL,
  "is_archived" BOOLEAN NOT NULL DEFAULT false,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL
);

CREATE TABLE "Completion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "mission_id" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "is_done" BOOLEAN NOT NULL DEFAULT true,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  CONSTRAINT "Completion_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "Mission" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Completion_mission_id_date_key" ON "Completion"("mission_id", "date");
