-- Migration: add payday_day_end for flexible payday ranges
ALTER TABLE users ADD COLUMN payday_day_end INTEGER NOT NULL DEFAULT 28;
