import React from 'react';
import { PickHistory } from '@/components/draft/PickHistory';

export function PickLogPage() {
  return (
    <div className="p-4 h-full flex flex-col max-w-4xl mx-auto w-full">
       <PickHistory />
    </div>
  );
}
