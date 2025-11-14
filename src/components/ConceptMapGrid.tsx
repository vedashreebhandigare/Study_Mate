/**
 * Category Grid Visualization for Concept Maps
 * Organizes nodes in clean grid by their 6 semantic types
 */

import { useState } from "react";
import { 
  ConceptNode, 
  ConceptMapData,
  getNodeColor,
  getNodeIcon,
  NodeType,
} from "../lib/concept-map-generator";
import { Search, Layers } from "lucide-react";

interface ConceptMapGridProps {
  data: ConceptMapData;
  documentTitle?: string;
}

export function ConceptMapGrid({ data, documentTitle }: ConceptMapGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<ConceptNode | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<NodeType | null>(null);

  // Group nodes by type
  const nodesByType = data.nodes.reduce((acc, node) => {
    if (!acc[node.type]) acc[node.type] = [];
    acc[node.type].push(node);
    return acc;
  }, {} as Record<NodeType, ConceptNode[]>);

  const categories: { type: NodeType; label: string; color: string }[] = [
    { type: "model", label: "Models & Algorithms", color: getNodeColor("model") },
    { type: "dataset", label: "Data & Datasets", color: getNodeColor("dataset") },
    { type: "metric", label: "Metrics & Evaluation", color: getNodeColor("metric") },
    { type: "technique", label: "Techniques & Methods", color: getNodeColor("technique") },
    { type: "component", label: "Components & Modules", color: getNodeColor("component") },
    { type: "tradeoff", label: "Trade-offs & Constraints", color: getNodeColor("tradeoff") },
  ];

  const filteredCategories = selectedCategory 
    ? categories.filter(c => c.type === selectedCategory)
    : categories;

  return (
    <div className="relative h-full w-full overflow-auto bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Controls */}
      <div className="sticky top-0 z-20 mb-6 flex items-center gap-3 bg-slate-900/50 backdrop-blur-xl rounded-2xl p-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            placeholder="Search concepts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl glass-panel border border-white/10 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-purple-400/50"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-2 rounded-lg text-xs transition-colors ${
              !selectedCategory 
                ? 'bg-purple-500 text-white' 
                : 'glass-panel text-white/60 hover:text-white'
            }`}
          >
            All Categories
          </button>
          {categories.map(cat => (
            <button
              key={cat.type}
              onClick={() => setSelectedCategory(selectedCategory === cat.type ? null : cat.type)}
              className={`p-2 rounded-lg transition-colors ${
                selectedCategory === cat.type
                  ? 'ring-2 ring-white'
                  : 'glass-panel hover:bg-white/10'
              }`}
              style={{ 
                backgroundColor: selectedCategory === cat.type ? cat.color : 'transparent',
                borderColor: cat.color,
                borderWidth: '1px'
              }}
              title={cat.label}
            >
              <span className="text-lg">{getNodeIcon(cat.type)}</span>
            </button>
          ))}
        </div>

        <div className="ml-auto glass-panel rounded-lg px-3 py-2 text-xs text-white/60">
          {data.nodes.length} concepts • {data.edges.length} connections
        </div>
      </div>

      {/* Grid by Category */}
      <div className="space-y-8">
        {filteredCategories.map(category => {
          const nodes = nodesByType[category.type] || [];
          if (nodes.length === 0) return null;

          const filteredNodes = searchQuery
            ? nodes.filter(n => 
                n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                n.definition.toLowerCase().includes(searchQuery.toLowerCase())
              )
            : nodes;

          if (filteredNodes.length === 0) return null;

          return (
            <div key={category.type} className="glass-panel-strong rounded-3xl p-6">
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{
                    backgroundColor: category.color + '20',
                    border: `2px solid ${category.color}`,
                  }}
                >
                  {getNodeIcon(category.type)}
                </div>
                <div>
                  <h3 className="text-white text-lg font-medium">{category.label}</h3>
                  <p className="text-white/60 text-sm">{filteredNodes.length} concepts</p>
                </div>
              </div>

              {/* Nodes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNodes.map(node => {
                  const isSelected = selectedNode === node.id;
                  const isHovered = hoveredNode?.id === node.id;

                  // Get connections
                  const connections = data.edges.filter(
                    e => e.source === node.id || e.target === node.id
                  );

                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(isSelected ? null : node.id)}
                      onMouseEnter={() => setHoveredNode(node)}
                      onMouseLeave={() => setHoveredNode(null)}
                      className={`
                        relative p-4 rounded-xl cursor-pointer transition-all duration-200
                        ${isSelected ? 'ring-2 ring-white shadow-2xl scale-105' : 'shadow-lg'}
                        ${isHovered ? 'scale-102 shadow-xl' : ''}
                      `}
                      style={{
                        backgroundColor: category.color + '15',
                        border: `2px solid ${category.color}40`,
                      }}
                    >
                      {/* Node Header */}
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                          style={{
                            backgroundColor: category.color + '30',
                            border: `2px solid ${category.color}60`,
                          }}
                        >
                          {getNodeIcon(node.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white text-sm font-medium mb-1">{node.label}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                              {node.type}
                            </span>
                            <span className="text-xs text-white/50">
                              {connections.length} connections
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Definition */}
                      <p className="text-sm text-white/80 leading-relaxed line-clamp-3 mb-3">
                        {node.definition}
                      </p>

                      {/* Role */}
                      {node.role && (
                        <div className="mb-3 p-2 bg-white/5 rounded-lg">
                          <p className="text-xs text-purple-300/90 mb-1">🎯 Role:</p>
                          <p className="text-xs text-white/80 line-clamp-2">{node.role}</p>
                        </div>
                      )}

                      {/* Metrics */}
                      {node.metrics && Object.keys(node.metrics).length > 0 && (
                        <div className="p-3 bg-gradient-to-br from-orange-500/10 to-purple-500/10 rounded-lg border border-orange-400/20">
                          <div className="text-xs text-orange-300 mb-2 uppercase tracking-wide">
                            📊 Performance
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(node.metrics).map(([key, value]) => (
                              <div key={key} className="text-xs">
                                <div className="text-white/50 mb-0.5">{key.replace(/_/g, ' ')}</div>
                                <div className="text-white font-medium">{value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Connection Preview */}
                      {isSelected && connections.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs text-white/60 mb-2">Connected to:</p>
                          <div className="flex flex-wrap gap-1">
                            {connections.slice(0, 3).map((edge, i) => {
                              const connectedId = edge.source === node.id ? edge.target : edge.source;
                              const connectedNode = data.nodes.find(n => n.id === connectedId);
                              return connectedNode ? (
                                <span
                                  key={i}
                                  className="text-xs px-2 py-1 rounded bg-white/10 text-white/80"
                                >
                                  {connectedNode.label}
                                </span>
                              ) : null;
                            })}
                            {connections.length > 3 && (
                              <span className="text-xs px-2 py-1 rounded bg-white/10 text-white/60">
                                +{connections.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Details Tooltip (only on hover) */}
      {hoveredNode && (
        <div className="fixed bottom-6 left-6 right-6 glass-panel-strong rounded-2xl p-5 z-50 max-w-3xl mx-auto pointer-events-none shadow-2xl">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ 
                backgroundColor: getNodeColor(hoveredNode.type) + '20', 
                border: `3px solid ${getNodeColor(hoveredNode.type)}` 
              }}
            >
              {getNodeIcon(hoveredNode.type)}
            </div>
            <div className="flex-1">
              <h4 className="text-white text-xl mb-2 font-medium">{hoveredNode.label}</h4>
              <p className="text-sm text-white/90 leading-relaxed mb-3">{hoveredNode.definition}</p>
              {hoveredNode.role && (
                <div className="mb-3">
                  <p className="text-xs text-cyan-300/90 mb-1">🎯 Role in System:</p>
                  <p className="text-sm text-white/90">{hoveredNode.role}</p>
                </div>
              )}
              {hoveredNode.category && (
                <p className="text-xs text-emerald-300/90">
                  📂 Category: {hoveredNode.category}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
