-- Workflow Templates table
CREATE TABLE public.workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,         -- NULL = official preset
  name text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'custom',              -- 'official' | 'custom' | 'shared'
  tags text[] DEFAULT '{}',
  thumbnail_url text,
  template_data jsonb NOT NULL,                -- { version, nodes, edges, metadata }
  node_count integer DEFAULT 0,
  is_public boolean DEFAULT false,
  use_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

-- Users can read: own templates, official templates, public templates
CREATE POLICY "Users can read accessible templates"
  ON public.workflow_templates FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR is_public = true
  );

-- Users can insert their own templates
CREATE POLICY "Users can create own templates"
  ON public.workflow_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON public.workflow_templates FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON public.workflow_templates FOR DELETE
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_templates_user ON public.workflow_templates(user_id);
CREATE INDEX idx_templates_category ON public.workflow_templates(category);
CREATE INDEX idx_templates_public ON public.workflow_templates(is_public) WHERE is_public = true;
CREATE INDEX idx_templates_shared_popular
  ON public.workflow_templates(use_count DESC)
  WHERE is_public = true AND category = 'shared';

-- Updated_at trigger (reuse existing function from 010_triggers.sql if available)
CREATE TRIGGER set_workflow_templates_updated_at
  BEFORE UPDATE ON public.workflow_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
