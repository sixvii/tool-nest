import { useParams } from 'react-router-dom';
import { categoriesData } from '../data/toolsData';
import Breadcrumb from '../components/Breadcrumb';
import ToolNotFound from '../components/ToolNotFound';
import { TOOL_REGISTRY } from '../constants/toolRegistry';

export default function ToolPage() {
  const { category, toolName } = useParams();
  const currentCategory = categoriesData.find((c) => c.id === category);
  const decodedToolName = toolName ? decodeURIComponent(toolName) : '';

  const renderTool = () => {
    const entry = TOOL_REGISTRY[decodedToolName];
    if (!entry) return <ToolNotFound toolName={decodedToolName} />;
    const Component = entry.component;
    const props = entry.props ? { ...entry.props } : {};
    if (entry.passToolName) props.toolName = decodedToolName;
    return <Component {...props} />;
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800 pb-8 sm:pb-12">
      <Breadcrumb category={currentCategory} toolName={decodedToolName} />
      <main className="max-w-6xl mx-auto px-3 sm:px-6 mt-2 sm:mt-4">{renderTool()}</main>
    </div>
  );
}
