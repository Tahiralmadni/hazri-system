import { Helmet } from 'react-helmet-async';

export const SEOHelmet = ({ 
  title, 
  description = 'Hazri System - Attendance Management System', 
  canonicalPath = '', 
  keywords = 'attendance, management, teacher, admin' 
}) => {
  const baseUrl = window.location.origin;
  const canonicalUrl = `${baseUrl}${canonicalPath || window.location.pathname}`;
  
  return (
    <Helmet>
      <title>{title ? `${title} | Hazri System` : 'Hazri System'}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={title ? `${title} | Hazri System` : 'Hazri System'} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title ? `${title} | Hazri System` : 'Hazri System'} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}; 

