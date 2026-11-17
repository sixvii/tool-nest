import PropTypes from 'prop-types';

export default function TabBar({ tabs, activeTab, onChange }) {
  return (
    <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all
            ${
              activeTab === tab
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

TabBar.propTypes = {
  tabs: PropTypes.arrayOf(PropTypes.string).isRequired,
  activeTab: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};
