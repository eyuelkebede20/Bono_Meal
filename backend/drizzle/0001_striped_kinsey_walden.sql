CREATE TYPE "public"."meal_plan_type" AS ENUM('allowance_based', 'prepaid');--> statement-breakpoint
ALTER TYPE "public"."transaction_type" ADD VALUE 'allowance_reset';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'cafe_manager';--> statement-breakpoint
ALTER TABLE "top_up_requests" ADD COLUMN "receipt_image_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "meal_plan_type" "meal_plan_type" DEFAULT 'prepaid' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "token_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "approved_by_id" uuid;