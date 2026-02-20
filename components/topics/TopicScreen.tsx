import React from 'react';
import { useParams } from 'react-router-dom';
import { TopicExplorerPanel } from './TopicExplorerPanel';

export const TopicScreen: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  return <TopicExplorerPanel initialSlug={slug} />;
};
