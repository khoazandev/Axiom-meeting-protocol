'use client';

import React from 'react';
import { CVData } from '@/types/cv';
import { CVHarvardTemplate } from './CVHarvardTemplate';
import { CVModernTemplate } from './CVModernTemplate';
import { CVMinimalistTemplate } from './CVMinimalistTemplate';
import { CVExecutiveTemplate } from './templates/CVExecutiveTemplate';
import { CVDesignerTemplate } from './templates/CVDesignerTemplate';
import { CVFounderTemplate } from './templates/CVFounderTemplate';
import { CVBankingTemplate } from './templates/CVBankingTemplate';
import { CVSalesTemplate } from './templates/CVSalesTemplate';
import { CVAestheticDevTemplate } from './templates/CVAestheticDevTemplate';
import { CVBATemplate } from './templates/CVBATemplate';
import { CVBlankTemplate } from './templates/CVBlankTemplate';

interface CVTemplateRendererProps {
  data: CVData;
  onUpdate?: (data: CVData) => void;
  selectedElementId?: string | null;
  onSelectElement?: (id: string) => void;
}

export function CVTemplateRenderer({
  data,
  onUpdate,
  selectedElementId,
  onSelectElement,
}: CVTemplateRendererProps) {
  const commonProps = {
    data,
    onUpdate,
    selectedElementId,
    onSelectElement,
  };

  switch (data.templateId) {
    case 'harvard':
      return <CVHarvardTemplate {...commonProps} />;
    case 'modern':
      return <CVModernTemplate {...commonProps} />;
    case 'minimalist':
      return <CVMinimalistTemplate {...commonProps} />;
    case 'executive':
      return <CVExecutiveTemplate {...commonProps} />;
    case 'designer':
      return <CVDesignerTemplate {...commonProps} />;
    case 'founder':
      return <CVFounderTemplate {...commonProps} />;
    case 'banking':
      return <CVBankingTemplate {...commonProps} />;
    case 'sales':
      return <CVSalesTemplate {...commonProps} />;
    case 'aesthetic':
      return <CVAestheticDevTemplate {...commonProps} />;
    case 'ba':
      return <CVBATemplate {...commonProps} />;
    case 'blank':
      return <CVBlankTemplate {...commonProps} />;
    default:
      return <CVHarvardTemplate {...commonProps} />;
  }
}
