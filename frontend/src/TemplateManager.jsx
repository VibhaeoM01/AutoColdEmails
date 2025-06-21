import React, { useState, useEffect } from 'react';

const TemplateManager = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/templates');
        if (!response.ok) {
          throw new Error('Failed to fetch templates');
        }
        const data = await response.json();
        setTemplates(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleEdit = (template) => {
    setEditingTemplate({ ...template });
  };

  const handleCancel = () => {
    setEditingTemplate(null);
  };

  const handleSave = async () => {
    if (!editingTemplate) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/templates/${editingTemplate.type}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: editingTemplate.subject,
          template: editingTemplate.template,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to save template');
      }

      const updatedTemplate = await response.json();
      setTemplates(templates.map(t => t.type === updatedTemplate.type ? updatedTemplate : t));
      setEditingTemplate(null);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditingTemplate(prev => ({ ...prev, [name]: value }));
  };

  if (loading && !editingTemplate) return <div>Loading templates...</div>;
  

  return (
    <div>
      <h2>Manage Email Templates</h2>
      {error && <div style={{ color: '#dc3545', marginBottom: '1rem', padding: '10px', border: '1px solid #dc3545', borderRadius: '5px' }}>Error: {error}</div>}
      {templates.map(template => (
        <div key={template.type} style={{ border: '1px solid #444', padding: '15px', marginBottom: '15px', borderRadius: '8px' }}>
          <h3>{template.type.charAt(0).toUpperCase() + template.type.slice(1)}</h3>

          {editingTemplate && editingTemplate.type === template.type ? (
            <div>
              <div className="input-group">
                <label><strong>Subject:</strong></label>
                <input
                  type="text"
                  name="subject"
                  value={editingTemplate.subject}
                  onChange={handleChange}
                />
              </div>
              <div className="input-group">
                <label><strong>Template:</strong></label>
                <textarea
                  name="template"
                  value={editingTemplate.template}
                  onChange={handleChange}
                  rows={15}
                />
              </div>
              <button onClick={handleSave} disabled={loading} style={{ marginRight: '10px' }}>
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button onClick={handleCancel} disabled={loading}>Cancel</button>
            </div>
          ) : (
            <div>
              <p><strong>Subject:</strong> {template.subject}</p>
              <pre style={{ whiteSpace: 'pre-wrap', background: '#2a2a2a', padding: '10px', borderRadius: '3px', border: '1px solid #444' }}>
                {template.template}
              </pre>
              <button onClick={() => handleEdit(template)}>Edit</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TemplateManager; 