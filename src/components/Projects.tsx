import React from 'react';
import ProjectDeepDive from '@/components/ProjectDeepDive';
import { BentoGrid, BentoCard } from '@/components/BentoGrid';

// --- MAIN COMPONENT ---

const Projects: React.FC = () => {
  return (
    <div id="impact" className="mt-0 scroll-mt-24">
 <BentoGrid className="pb-12">
          <BentoCard colSpan={2} noFade={true} id="proj-1" className="mb-4 scroll-mt-24">
             <ProjectDeepDive 
              title="Agentic Revenue Optimization"
              role="AI/ML Engineer"
              problem="High biological variability in donor starting material (Leukopaks, Bone Marrow) led to unpredictable cell yields, causing inventory misalignment and lost revenue on rare cell types."
              solution="Architected a predictive model to classify donors by highest probable cell yield (optimizing for Rarity vs. Throughput). Deployed an Agentic Interface to bridge lab data with enterprise ERP systems, automating yield reporting for sales teams."
              parameters={['Weight', 'Height', 'Age', 'Sex', 'Ethnicity','Smoker','Blood Type', 'CMV Status', 'Cell Count (TNC)', 'Cell Count (MNC)', 'Cell Count (Isolate)']}
              tags={['CRM (CRIO)','ERP (SAP)','Snowflake', 'BI (Tableau)', 'SQL','Python']}
              kpis={['Querying from hours to minutes','Ability to select donors for orders']}
            />
          </BentoCard>

          <BentoCard colSpan={2} noFade={true} id="proj-2">
             <ProjectDeepDive 
              title="Agentic Onboarding"
              role="AI/ML Engineer"
              problem="Fragmented documentation and reliance on tribal knowledge (i.e word of mouth) caused slow onboarding and information silos."
              solution="RAG Agents fine-tuned to department specific standard operating procedures (SOP) for niche context with atleast one (1) orchestrator agent with general context for cross-functional insight"
              parameters={['SOP','Work Instructions','Human Validated Training Text']}
              tags={['Google','ERP (SAP)','Snowflake', 'Atlassian (Confluence)','MCP','Vector DB', 'SQL','Python']}
              kpis={['Increased learning rate up to 80% (Wright’s Law: Stanford-B model)', 'Resource efficient contextual GenAI']}
            />
          </BentoCard>
        </BentoGrid>
    </div>
  );
};

export default Projects;