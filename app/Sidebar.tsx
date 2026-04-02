import { useState, useEffect } from 'react';
import { Annotation } from './types';

interface SidebarProps {
  annotation: Annotation | null;
  onUpdate: (annotation: Annotation) => void;
  onDelete: (id: string) => void;
}

export default function Sidebar({ annotation, onUpdate, onDelete }: SidebarProps) {
  const [name, setName] = useState(annotation?.name || '');
  const [regex, setRegex] = useState(annotation?.regex || '');
  const [anchor, setAnchor] = useState<Annotation['anchor']>(annotation?.anchor || 'top-left');

  useEffect(() => {
    setName(annotation?.name || '');
    setRegex(annotation?.regex || '');
    setAnchor(annotation?.anchor || 'top-left');
  }, [annotation?.id]);

  const handleSave = () => {
    if (!annotation) return;
    
    onUpdate({
      ...annotation,
      name,
      regex,
      anchor
    });
  };

  if (!annotation) {
    return (
      <div className="p-4 text-sm text-gray-400">
        <p>Select a field above, or draw a new rectangle on the PDF.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Field Properties</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Regex Pattern</label>
        <input
          type="text"
          value={regex}
          onChange={(e) => setRegex(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter regex pattern for validation"
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Anchor Position</label>
        <div className="flex space-x-3">
          {[['top-left', 'Top Left'], ['top-right', 'Top Right'], ['bottom-left', 'Bottom Left'], ['bottom-right', 'Bottom Right']].map(([value, label]) => (
            <label key={value} className="flex items-center">
              <input
                type="radio"
                value={value}
                checked={anchor === value}
                onChange={(e) => setAnchor(e.target.value as Annotation['anchor'])}
                className="mr-2"
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div className="flex items-center justify-end space-x-3">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Save
        </button>
        <button
          onClick={() => onDelete(annotation.id)}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
}