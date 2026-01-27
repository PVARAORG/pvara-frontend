import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/**
 * ContentPage - Generic component to display content pages (About Us, FAQ, Privacy Policy, Terms of Service)
 * Fetches content from the API based on slug and renders it with a consistent layout
 */
export default function ContentPage({ slug, onBack }) {
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchContent();
    }, [slug]);

    const fetchContent = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/api/content/${slug}`);
            const data = await response.json();

            if (data.success && data.page) {
                setPage(data.page);
            } else {
                setError('Page not found');
            }
        } catch (err) {
            console.error('Error fetching content:', err);
            setError('Failed to load content');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600 font-medium">Loading content...</p>
                </div>
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center glass-card p-8 md:p-12 rounded-2xl max-w-md mx-auto">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">Page Not Found</h2>
                    <p className="text-gray-600 mb-6">The content you're looking for hasn't been created yet.</p>
                    <button
                        onClick={onBack}
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-6 md:py-10 px-4">
            {/* Back Button */}
            <button
                onClick={onBack}
                className="mb-6 flex items-center gap-2 text-gray-600 hover:text-green-700 transition-colors group"
            >
                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Back</span>
            </button>

            {/* Content Card */}
            <div className="glass-card rounded-2xl p-6 md:p-10 shadow-lg">
                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">
                    {page.title}
                </h1>

                {/* Content */}
                <div
                    className="prose prose-lg max-w-none text-gray-700 leading-relaxed
            prose-headings:text-gray-900 prose-headings:font-bold
            prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
            prose-p:mb-4
            prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
            prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
            prose-li:mb-2
            prose-a:text-green-700 prose-a:hover:text-green-800 prose-a:underline
            prose-strong:text-gray-900"
                    dangerouslySetInnerHTML={{ __html: page.content }}
                />

                {/* Last Updated */}
                {page.updatedAt && (
                    <div className="mt-10 pt-6 border-t border-gray-200">
                        <p className="text-sm text-gray-500">
                            Last updated: {new Date(page.updatedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
