const emailJsConfig = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
  defaultTemplateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  jobApplicationTemplateId:
    import.meta.env.VITE_EMAILJS_JOB_APPLICATION_TEMPLATE_ID ||
    import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  contactTemplateId:
    import.meta.env.VITE_CONTACT_US_EMAILJS_TEMPLATE_ID ||
    import.meta.env.VITE_EMAILJS_CONTACT_TEMPLATE_ID ||
    import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  contactServiceId:
    import.meta.env.VITE_CONTACT_US_EMAILJS_SERVICE_ID ||
    import.meta.env.VITE_EMAILJS_SERVICE_ID,
  contactPublicKey:
    import.meta.env.VITE_CONTACT_US_EMAILJS_PUBLIC_KEY ||
    import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
};

export const getEmailJsConfig = () => emailJsConfig;

export const isEmailJsConfigured = (templateId) =>
  Boolean(emailJsConfig.serviceId && emailJsConfig.publicKey && templateId);
