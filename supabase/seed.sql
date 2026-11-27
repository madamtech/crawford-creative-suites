-- Dummy data for a TEST project or the local preview only. Never run on the
-- live project. All people and businesses below are made up; every address
-- uses the reserved example.test domain, so no real email can be sent.

-- Admin for the preview: sign in as admin@example.test.
insert into public.user_roles (email, role) values ('admin@example.test', 'admin');

select public.submit_request('{"form":"order","data":{
  "name":"Jordan Lee","email":"jordan@example.test","phone":"555-0100",
  "service":"3D printing","project_type":"Display stands","qty":"12","size":"4 x 6 in",
  "material":"PLA","budget_range":"$100-$250","due_date":"2026-12-18",
  "details":"Matte black stands for Willow & Wick Body Co. candle jars, logo on the front.",
  "form_fields":{"Color palette":"Black and gold"}}}'::jsonb);

select public.submit_request('{"form":"order","data":{
  "name":"Jordan Lee","email":"jordan@example.test",
  "service":"Laser engraving","project_type":"Gift tags","qty":"50","material":"Wood",
  "rush":true,"due_date":"2026-12-05","details":"Round wood tags with a small leaf."}}'::jsonb);

select public.submit_request('{"form":"order","data":{
  "name":"Riley Park","email":"riley@example.test",
  "service":"3D printing","project_type":"Lithophane lamp","qty":"1","material":"PLA",
  "due_date":"2026-11-20","details":"Family photo lamp, warm white light."}}'::jsonb);

select public.submit_request('{"form":"ai_intake","data":{
  "name":"Jordan Lee","email":"jordan@example.test",
  "business_challenge":"Order emails pile up and I lose track of custom requests.",
  "desired_outcome":"One place to see every order and reply faster.",
  "ai_experience":"Some ChatGPT","timeline":"Next 30 days","budget_range":"$500-$1,500",
  "engagement":"Workflow automation"}}'::jsonb);

select public.submit_request('{"form":"ma_request","data":{
  "name":"Casey Morgan","email":"casey@example.test","kind":"memorial","item":"Memorial candle set",
  "details":"Two memorial candles with a name and dates on the label.","needed_by":"2026-12-12",
  "budget_range":"$50-$100"}}'::jsonb);

select public.submit_request('{"form":"lead","data":{
  "name":"Sam Rivera","email":"sam@example.test","business_interest":"allure_fusions",
  "consent":true,"message":"Interested in a class on laser engraving.","source":"Maker''s Lounge"}}'::jsonb);

-- A Ueni shop order as Peyton's email sync would write it.
insert into public.madam_allure_orders (kind, ueni_order_ref, ordered_at, name, email, items, amount, amount_paid, paid, status, source, raw)
values ('shop', 'UENI-TEST-1001', now() - interval '2 days', 'Casey Morgan', 'casey@example.test',
        '[{"name":"Hair Growth Oil 4 oz","qty":1,"price":18}]', 18, 18, 'paid_in_full', 'Completed', 'ueni_email',
        '{"note":"dummy row"}');

-- Quotes, a deposit, and a status change so every screen has something to show.
select set_config('ccs.actor', 'admin@example.test', false);
update public.orders set quote = 180, status = 'Quoted' where order_number = 'AFF-0002';
update public.orders set quote = 30 where order_number = 'AFF-0003';
update public.orders set quote = 95, status = 'Quoted' where order_number = 'AFF-0004';
select public.apply_payment('{"number":"AFF-0004","provider":"manual","provider_ref":"seed-1","kind":"deposit","amount":57}'::jsonb);
select set_config('ccs.actor', 'admin@example.test', false);
update public.orders set status = 'In Production' where order_number = 'AFF-0004';
update public.ai_intake set status = 'Discovery scheduled', quote = 1200, deposit_due = 600 where intake_number = 'AIA-0001';
select set_config('ccs.actor', '', false);
