-- Creator attribution: make it survive a device switch, and make it countable.
--
-- Additive only. Both columns are nullable with no default and no backfill, so every existing row
-- is untouched and nothing that reads the old shape can break.
--
-- "User"."referredByWhopCode": which creator's ?a= code brought this account in. Until now the code
-- lived only in localStorage, which is per-browser — a viewer who tapped a creator's link on their
-- phone and paid on a laptop lost the attribution and the creator silently lost the commission.
-- Moving it onto the account makes the account the carrier.
--
-- "Order"."whopAffiliate": the code actually handed to Whop for that sale, so we can answer
-- "how many sales did your link produce" ourselves instead of asking the creator to go read Whop.

ALTER TABLE "User" ADD COLUMN "referredByWhopCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "whopAffiliate" TEXT;

CREATE INDEX "User_referredByWhopCode_idx" ON "User"("referredByWhopCode");
CREATE INDEX "Order_whopAffiliate_idx" ON "Order"("whopAffiliate");
