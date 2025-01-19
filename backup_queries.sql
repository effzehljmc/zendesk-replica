-- Export roles table
COPY (
  SELECT * FROM roles
) TO STDOUT WITH CSV HEADER;

-- Export profiles table
COPY (
  SELECT * FROM profiles
) TO STDOUT WITH CSV HEADER;

-- Export user_roles table
COPY (
  SELECT * FROM user_roles
) TO STDOUT WITH CSV HEADER;

-- Export tickets table
COPY (
  SELECT * FROM tickets
) TO STDOUT WITH CSV HEADER;

-- Export kb_articles table
COPY (
  SELECT * FROM kb_articles
) TO STDOUT WITH CSV HEADER;

-- Alternatively, if you want to see the data first:
-- View roles
SELECT * FROM roles;

-- View profiles
SELECT * FROM profiles;

-- View user_roles with role names
SELECT ur.*, r.name as role_name 
FROM user_roles ur 
JOIN roles r ON ur.role_id = r.id;

-- View tickets with creator and assignee names
SELECT t.*, 
       c.email as creator_email,
       a.email as assignee_email
FROM tickets t
LEFT JOIN profiles c ON t.created_by = c.id
LEFT JOIN profiles a ON t.assigned_to = a.id;

-- View kb_articles with author names
SELECT ka.*, p.email as author_email
FROM kb_articles ka
JOIN profiles p ON ka.author_id = p.id; 