-- تصحيح مستويات الحسابات بناءً على طول الكود
-- المستوى 1: أكواد من رقم واحد (1, 2, 3, 4, 5)
-- المستوى 2: أكواد من رقمين (11, 12, 20, 31)
-- المستوى 3: أكواد من 3 أرقام (111, 204, 311, 521)
-- المستوى 4: أكواد من 4 أرقام أو أكثر (1112, 2040305)

UPDATE chart_of_accounts
SET level = CASE 
  WHEN LENGTH(code) = 1 THEN 1
  WHEN LENGTH(code) = 2 THEN 2
  WHEN LENGTH(code) = 3 THEN 3
  WHEN LENGTH(code) >= 4 THEN 4
  ELSE level
END
WHERE level != CASE 
  WHEN LENGTH(code) = 1 THEN 1
  WHEN LENGTH(code) = 2 THEN 2
  WHEN LENGTH(code) = 3 THEN 3
  WHEN LENGTH(code) >= 4 THEN 4
  ELSE level
END;