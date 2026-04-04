export interface WorkflowTemplate {
  id: string;
  user_id: string | null;
  name: string;
  description: string;
  category: 'official' | 'custom' | 'shared';
  tags: string[];
  thumbnail_url: string | null;
  node_count: number;
  is_public: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTemplateDetail extends WorkflowTemplate {
  template_data: {
    version: number;
    nodes: unknown[];
    edges: unknown[];
    metadata: {
      name: string;
      description: string;
      requiredNodeTypes: string[];
    };
  };
}
