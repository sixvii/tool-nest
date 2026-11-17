import { useState } from 'react';
import PropTypes from 'prop-types';
import XmlToJson from './XmlToJson';
import JsonToXml from './JsonToXml';
import { useToolPersistence } from '../../hooks/useToolPersistence';

const tools = [
  { id: 'XML to JSON', label: 'XML → JSON' },
  { id: 'JSON to XML', label: 'JSON → XML' },
];

export default function XMLJSONConverter({ initialTool = 'XML to JSON' }) {
  const [activeTool, setActiveTool] = useState(initialTool);

  useToolPersistence({
    namespace: 'xml-json-tabs',
    snapshot: { activeTool },
    hasContent: activeTool !== initialTool,
    onRestore: (s) => {
      if (s.activeTool) setActiveTool(s.activeTool);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Nav */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            style={{
              padding: '8px 20px',
              fontSize: '14px',
              fontWeight: '600',
              borderRadius: '9999px',
              border: activeTool === tool.id ? 'none' : '1px solid #e2e8f0',
              background: activeTool === tool.id ? '#2563eb' : '#ffffff',
              color: activeTool === tool.id ? '#ffffff' : '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tool.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTool === 'XML to JSON' ? <XmlToJson /> : <JsonToXml />}
    </div>
  );
}

XMLJSONConverter.propTypes = {
  initialTool: PropTypes.string,
};
