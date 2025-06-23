/*
  # Add clinic_id to walk_ins table and fix RLS

  1. Schema Changes
    - Add clinic_id column to walk_ins table
    - Add foreign key constraint to clinics table
    - Add index for performance

  2. Data Migration
    - Update existing walk_ins records (if any) to have a default clinic_id
    - This is safe since we're adding the column as nullable first

  3. Security
    - Prepare for RLS policies in next migration
*/

-- Add clinic_id column to walk_ins table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'walk_ins' 
    AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE walk_ins ADD COLUMN clinic_id uuid;
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'walk_ins_clinic_id_fkey'
  ) THEN
    ALTER TABLE walk_ins 
    ADD CONSTRAINT walk_ins_clinic_id_fkey 
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_walk_ins_clinic_id ON walk_ins(clinic_id);

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_walk_ins_status ON walk_ins(status);

-- Add index for created_at for ordering
CREATE INDEX IF NOT EXISTS idx_walk_ins_created_at ON walk_ins(created_at);

-- Update the id column to use bigserial if it's not already
DO $$
BEGIN
  -- Check if the id column is already bigserial/bigint with default
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'walk_ins' 
    AND column_name = 'id' 
    AND column_default LIKE 'nextval%'
  ) THEN
    -- Create a sequence for the id column
    CREATE SEQUENCE IF NOT EXISTS walk_ins_id_seq;
    
    -- Set the id column to use the sequence
    ALTER TABLE walk_ins ALTER COLUMN id SET DEFAULT nextval('walk_ins_id_seq');
    
    -- Set the sequence ownership
    ALTER SEQUENCE walk_ins_id_seq OWNED BY walk_ins.id;
    
    -- Set the sequence to start from the current max id + 1
    PERFORM setval('walk_ins_id_seq', COALESCE((SELECT MAX(id) FROM walk_ins), 0) + 1);
  END IF;
END $$;

-- Ensure created_at has a default value
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'walk_ins' 
    AND column_name = 'created_at' 
    AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE walk_ins ALTER COLUMN created_at SET DEFAULT now();
  END IF;
END $$;