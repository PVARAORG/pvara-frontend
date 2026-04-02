import React, { useState, useEffect } from 'react';
import { getApiOrigin } from './utils/apiBase';

const API_URL = getApiOrigin();

/**
 * ContentManagementPanel - Admin panel for managing content pages
 * Supports CRUD operations for FAQ, About Us, Privacy Policy, Terms of Service
 */
export default function ContentManagementPanel() {
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(null); // null, 'create', or page id
    const [formData, setFormData] = useState({
        slug: '',
        title: '',
        content: '',
        isActive: true,
        order: 0,
        metaDescription: ''
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/content/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setPages(data.pages || []);
            }
        } catch (err) {
            console.error('Error fetching pages:', err);
            showMessage('Failed to load content pages', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleCreate = () => {
        setFormData({
            slug: '',
            title: '',
            content: '',
            isActive: true,
            order: pages.length,
            metaDescription: ''
        });
        setEditMode('create');
    };

    const handleEdit = (page) => {
        setFormData({
            slug: page.slug,
            title: page.title,
            content: page.content,
            isActive: page.isActive,
            order: page.order || 0,
            metaDescription: page.metaDescription || ''
        });
        setEditMode(page.slug);
    };

    const handleCancel = () => {
        setEditMode(null);
        setFormData({
            slug: '',
            title: '',
            content: '',
            isActive: true,
            order: 0,
            metaDescription: ''
        });
    };

    const handleSave = async () => {
        if (!formData.slug || !formData.title) {
            showMessage('Slug and title are required', 'error');
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const isCreating = editMode === 'create';
            const url = isCreating
                ? `${API_URL}/api/content/`
                : `${API_URL}/api/content/${editMode}`;

            const response = await fetch(url, {
                method: isCreating ? 'POST' : 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                showMessage(isCreating ? 'Page created successfully' : 'Page updated successfully');
                handleCancel();
                fetchPages();
            } else {
                showMessage(data.message || 'Failed to save page', 'error');
            }
        } catch (err) {
            console.error('Error saving page:', err);
            showMessage('Failed to save page', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (slug) => {
        if (!window.confirm(`Are you sure you want to delete "${slug}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/content/${slug}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                showMessage('Page deleted successfully');
                fetchPages();
            } else {
                showMessage(data.message || 'Failed to delete page', 'error');
            }
        } catch (err) {
            console.error('Error deleting page:', err);
            showMessage('Failed to delete page', 'error');
        }
    };

    const handleSeedDefaults = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/content/seed`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                showMessage(`Created ${data.created?.length || 0} default pages`);
                fetchPages();
            } else {
                showMessage(data.message || 'Failed to seed pages', 'error');
            }
        } catch (err) {
            console.error('Error seeding pages:', err);
            showMessage('Failed to seed default pages', 'error');
        }
    };

    const togglePageActive = async (page) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/content/${page.slug}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ isActive: !page.isActive })
            });

            const data = await response.json();

            if (data.success) {
                showMessage(`Page ${page.isActive ? 'hidden' : 'published'}`);
                fetchPages();
            }
        } catch (err) {
            console.error('Error toggling page:', err);
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600 font-medium">Loading content pages...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Management</h1>
                <p className="text-gray-600">Manage your website's static content pages like FAQ, About Us, Privacy Policy, and Terms of Service.</p>
            </div>

            {/* Message Toast */}
            {message && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium transition-all ${message.type === 'error' ? 'bg-red-500' : 'bg-green-500'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Action Bar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 justify-between items-center">
                <div className="flex gap-3">
                    {pages.length === 0 && (
                        <button
                            onClick={handleSeedDefaults}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            Create Default Pages
                        </button>
                    )}
                </div>
                <span className="text-sm text-gray-500">{pages.length} page(s)</span>
            </div>

            {/* Edit/Create Form */}
            {editMode && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                        {editMode === 'create' ? 'Create New Page' : `Edit: ${formData.title}`}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                            <input
                                type="text"
                                value={formData.slug}
                                onChange={(e) => setFormData(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                                disabled={editMode !== 'create'}
                                placeholder="about-us"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                            />
                            <p className="text-xs text-gray-500 mt-1">URL-friendly identifier (lowercase, hyphens only)</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                                placeholder="About Us"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description (SEO)</label>
                        <input
                            type="text"
                            value={formData.metaDescription}
                            onChange={(e) => setFormData(f => ({ ...f, metaDescription: e.target.value }))}
                            placeholder="Brief description for search engines..."
                            maxLength={300}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Content (HTML supported)</label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData(f => ({ ...f, content: e.target.value }))}
                            placeholder="<h2>Page Heading</h2><p>Your content here...</p>"
                            rows={12}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Supports HTML tags: h2, h3, p, ul, ol, li, a, strong, em</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                            <input
                                type="number"
                                value={formData.order}
                                onChange={(e) => setFormData(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                                min={0}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>
                        <div className="flex items-center gap-3 pt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData(f => ({ ...f, isActive: e.target.checked }))}
                                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <span className="font-medium text-gray-700">Published (visible to users)</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Save Page
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleCancel}
                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Pages List */}
            {pages.length === 0 && !editMode ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Content Pages Yet</h3>
                    <p className="text-gray-600 mb-4">Create your first content page or seed the default pages.</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {pages.map(page => (
                                <tr key={page.slug} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{page.title}</div>
                                        {page.metaDescription && (
                                            <div className="text-sm text-gray-500 truncate max-w-xs">{page.metaDescription}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <code className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">{page.slug}</code>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => togglePageActive(page)}
                                            className={`px-2 py-1 rounded text-xs font-medium ${page.isActive
                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            {page.isActive ? '✓ Published' : 'Draft'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(page)}
                                                className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(page.slug)}
                                                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
