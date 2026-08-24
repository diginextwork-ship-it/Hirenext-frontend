import { useEffect, useRef, useState } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Building, User, Phone, Mail, Briefcase, GraduationCap, ArrowRight, Loader2 } from "lucide-react";
import "../styles/job-application.css";
import { API_BASE_URL, BACKEND_CONNECTION_ERROR } from "../config/api";
import PageBackButton from "../components/PageBackButton";
import {
  fetchJobsFromApi,
  readStoredJob,
  storeSelectedJob,
} from "../utils/jobSearch";

const initialFormData = {
  name: "",
  phone: "",
  email: "",
  hasPriorExperience: "",
  experienceIndustry: "",
  experienceIndustryOther: "",
  currentSalary: "",
  expectedSalary: "",
  noticePeriod: "",
  yearsOfExperience: "",
  latestEducationLevel: "",
  boardUniversity: "",
  institutionName: "",
  age: "",
};

export default function JobApplication({ setCurrentPage, routeJobId }) {
  const formRef = useRef(null);
  const [formData, setFormData] = useState(initialFormData);
  const [resumeFile, setResumeFile] = useState(null);
  const [parsedResume, setParsedResume] = useState(null);
  const [isResumeProcessing, setIsResumeProcessing] = useState(false);
  const [resumeProcessingStage, setResumeProcessingStage] = useState("");
  const [resumeMessage, setResumeMessage] = useState("");
  const [resumeMessageType, setResumeMessageType] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [selectedJob, setSelectedJob] = useState(() => {
    const storedJob = readStoredJob();
    return storedJob?.id === routeJobId ? storedJob : null;
  });
  const [isJobLoading, setIsJobLoading] = useState(() => !selectedJob && Boolean(routeJobId));
  const activeResumeRequestIdRef = useRef(0);
  const selectedJobId = String(selectedJob?.id ?? selectedJob?.jid ?? "").trim();

  useEffect(() => {
    let isActive = true;

    const loadSelectedJob = async () => {
      const storedJob = readStoredJob();
      if (storedJob?.id === routeJobId) {
        setSelectedJob(storedJob);
        setIsJobLoading(false);
        return;
      }

      if (!routeJobId) {
        setSelectedJob(storedJob || null);
        setIsJobLoading(false);
        return;
      }

      setIsJobLoading(true);
      try {
        const jobs = await fetchJobsFromApi();
        if (!isActive) return;
        const matchedJob = jobs.find((job) => job.id === routeJobId) || null;
        setSelectedJob(matchedJob);
        if (matchedJob) {
          storeSelectedJob(matchedJob);
        }
      } catch (_error) {
        if (!isActive) return;
        setSelectedJob(storedJob || null);
      } finally {
        if (isActive) {
          setIsJobLoading(false);
        }
      }
    };

    loadSelectedJob();
    return () => {
      isActive = false;
    };
  }, [routeJobId]);

  const beginResumeRequest = (stage) => {
    const nextRequestId = activeResumeRequestIdRef.current + 1;
    activeResumeRequestIdRef.current = nextRequestId;
    setIsResumeProcessing(true);
    setResumeProcessingStage(stage);
    return nextRequestId;
  };

  const updateResumeRequestStage = (requestId, stage) => {
    if (activeResumeRequestIdRef.current !== requestId) return;
    setResumeProcessingStage(stage);
  };

  const finishResumeRequest = (requestId) => {
    if (activeResumeRequestIdRef.current !== requestId) return;
    setIsResumeProcessing(false);
    setResumeProcessingStage("");
  };

  const cancelResumeRequest = () => {
    activeResumeRequestIdRef.current += 1;
    setIsResumeProcessing(false);
    setResumeProcessingStage("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
      setPhoneError("");
      setFormData((prev) => ({ ...prev, [name]: digitsOnly }));
      return;
    }

    if (name === "hasPriorExperience") {
      setFormData((prev) => ({
        ...prev,
        hasPriorExperience: value,
        experienceIndustry: value === "yes" ? prev.experienceIndustry : "",
        experienceIndustryOther: value === "yes" ? prev.experienceIndustryOther : "",
        currentSalary: value === "yes" ? prev.currentSalary : "",
        expectedSalary: value === "yes" ? prev.expectedSalary : "",
        noticePeriod: value === "yes" ? prev.noticePeriod : "",
        yearsOfExperience: value === "yes" ? prev.yearsOfExperience : "",
      }));
      return;
    }

    if (name === "experienceIndustry") {
      setFormData((prev) => ({
        ...prev,
        experienceIndustry: value,
        experienceIndustryOther: value === "others" ? prev.experienceIndustryOther : "",
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read resume file."));
      reader.readAsDataURL(file);
    });

  const parseResumeAndAutofill = async (file, options = {}) => {
    if (!selectedJobId) {
      setResumeMessageType("error");
      setResumeMessage("Select a job first, then upload resume.");
      return null;
    }

    const requestId = options.requestId ?? beginResumeRequest("Parsing resume...");
    const shouldReleaseLock = options.requestId === undefined;
    setResumeMessage("");
    setResumeMessageType("");

    try {
      const resumeBase64 = options.resumeBase64 ?? (await fileToDataUrl(file));
      if (activeResumeRequestIdRef.current !== requestId) {
        return null;
      }

      updateResumeRequestStage(requestId, "Calculating ATS match score...");
      const response = await fetch(`${API_BASE_URL}/api/applications/parse-resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jid: selectedJobId,
          resumeBase64,
          resumeFilename: file.name,
          resumeMimeType: file.type,
        }),
      });

      const data = await response.json();
      if (activeResumeRequestIdRef.current !== requestId) {
        return null;
      }

      if (!response.ok) {
        throw new Error(data?.message || "Failed to parse resume.");
      }
      if (data?.processing && data.processing.submitAllowed !== true) {
        throw new Error(data?.message || "Resume processing is not complete yet.");
      }

      const autofill = data?.autofill || {};
      setFormData((prev) => ({
        ...prev,
        name: autofill.name || prev.name,
        phone: String(autofill.phone || prev.phone).replace(/\D/g, "").slice(0, 10),
        email: autofill.email || prev.email,
        latestEducationLevel: autofill.latestEducationLevel || prev.latestEducationLevel,
        boardUniversity: autofill.boardUniversity || prev.boardUniversity,
        institutionName: autofill.institutionName || prev.institutionName,
        age: autofill.age || prev.age,
      }));

      const parsedPayload = {
        resumeBase64,
        resumeFilename: file.name,
        resumeMimeType: file.type,
        parsedData: data?.parsedData || null,
        atsScore: data?.atsScore ?? null,
        atsMatchPercentage: data?.atsMatchPercentage ?? null,
        atsRawJson: data?.atsRawJson || null,
        parserMeta: data?.parser_meta || null,
        processing: data?.processing || null,
      };
      setParsedResume(parsedPayload);
      setResumeMessageType("success");
      setResumeMessage("Resume parsed & form autofilled with ATS match evaluation.");
      return parsedPayload;
    } catch (error) {
      if (activeResumeRequestIdRef.current !== requestId) {
        return null;
      }

      if (error instanceof TypeError) {
        setResumeMessageType("error");
        setResumeMessage(BACKEND_CONNECTION_ERROR);
      } else {
        setResumeMessageType("error");
        setResumeMessage(error.message || "Resume parsing failed.");
      }
      setParsedResume(null);
      return null;
    } finally {
      if (shouldReleaseLock) {
        finishResumeRequest(requestId);
      }
    }
  };

  const handleResumeFileChange = async (event) => {
    const file = event.target.files?.[0] || null;
    cancelResumeRequest();
    setResumeMessage("");
    setResumeMessageType("");
    setParsedResume(null);

    if (!file) {
      setResumeFile(null);
      return;
    }

    const isSupportedType = /\.(pdf|docx)$/i.test(file.name);
    if (!isSupportedType) {
      setResumeFile(null);
      setResumeMessageType("error");
      setResumeMessage("Only PDF and DOCX resumes are supported.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setResumeFile(null);
      setResumeMessageType("error");
      setResumeMessage("Resume file size must be 10MB or less.");
      event.target.value = "";
      return;
    }

    setResumeFile(file);
    const requestId = beginResumeRequest("Parsing resume...");
    try {
      await parseResumeAndAutofill(file, { requestId });
    } finally {
      finishResumeRequest(requestId);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isResumeProcessing) {
      return;
    }

    const requestId = beginResumeRequest("Submitting application...");
    setSubmitted(false);
    setSubmitMessage("");

    try {
      if (!selectedJobId) {
        setSubmitMessage("No job selected. Please go back and choose a job first.");
        return;
      }

      if (!resumeFile) {
        setSubmitMessage("Please upload your resume before submitting.");
        return;
      }

      let parsedResumePayload = parsedResume;
      if (!parsedResumePayload) {
        parsedResumePayload = await parseResumeAndAutofill(resumeFile, { requestId });
        if (!parsedResumePayload) {
          if (activeResumeRequestIdRef.current === requestId) {
            setSubmitMessage("Resume parsing failed. Please re-upload and try again.");
          }
          return;
        }
      }

      if (!/^\d{10}$/.test(formData.phone)) {
        setPhoneError("Phone number must be exactly 10 digits.");
        return;
      }

      if (!["yes", "no"].includes(formData.hasPriorExperience)) {
        setSubmitMessage("Please select whether you have prior experience.");
        return;
      }

      if (formData.hasPriorExperience === "yes") {
        if (
          !formData.experienceIndustry ||
          !formData.currentSalary ||
          !formData.expectedSalary ||
          !formData.noticePeriod ||
          !formData.yearsOfExperience
        ) {
          setSubmitMessage("Please complete all prior experience fields.");
          return;
        }

        if (
          formData.experienceIndustry === "others" &&
          !String(formData.experienceIndustryOther || "").trim()
        ) {
          setSubmitMessage("Please specify the industry when selecting others.");
          return;
        }
      }

      setPhoneError("");
      updateResumeRequestStage(requestId, "Submitting application...");
      const response = await fetch(`${API_BASE_URL}/api/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jid: selectedJobId,
          ...formData,
          resumeBase64: parsedResumePayload.resumeBase64,
          resumeFilename: parsedResumePayload.resumeFilename || resumeFile.name,
          resumeMimeType: parsedResumePayload.resumeMimeType || resumeFile.type,
          parsedData: parsedResumePayload.parsedData || null,
          atsScore: parsedResumePayload.atsScore ?? null,
          atsMatchPercentage: parsedResumePayload.atsMatchPercentage ?? null,
          atsRawJson: parsedResumePayload.atsRawJson || null,
        }),
      });

      const data = await response.json();
      if (activeResumeRequestIdRef.current !== requestId) {
        return;
      }

      if (!response.ok) {
        throw new Error(data?.message || "Failed to submit application.");
      }
      if (data?.processing && data.processing.submitAllowed !== true) {
        throw new Error(data?.message || "Application submission is not complete yet.");
      }

      setSubmitted(true);
      setSubmitMessage("Application submitted successfully! Our recruiters will review your profile.");
      setFormData(initialFormData);
      setResumeFile(null);
      setParsedResume(null);
      setResumeMessage("");
      setResumeMessageType("");
      if (formRef.current) {
        formRef.current.reset();
      }
    } catch (error) {
      if (activeResumeRequestIdRef.current !== requestId) {
        return;
      }

      if (error instanceof TypeError) {
        setSubmitMessage(BACKEND_CONNECTION_ERROR);
      } else {
        setSubmitMessage(error.message || "Application submission failed.");
      }
    } finally {
      finishResumeRequest(requestId);
    }
  };

  return (
    <main className="job-application-page ui-page">
      <section className="job-application-shell ui-shell">
        <div className="ui-page-back">
          <PageBackButton
            setCurrentPage={setCurrentPage}
            fallbackPage={selectedJobId ? "jobdetail" : "jobs"}
            fallbackParams={selectedJobId ? { jobId: selectedJobId } : undefined}
          />
        </div>

        <div className="job-application-layout">
          <div className="job-application-intro">
            <span className="job-application-kicker">Direct Hiring Portal</span>
            <h1>Submit Your Application</h1>
            {isJobLoading ? (
              <p>Loading selected job details...</p>
            ) : selectedJob ? (
              <p>
                Applying for <strong className="highlight-text">{selectedJob.title}</strong> at{" "}
                <strong className="highlight-text">{selectedJob.company}</strong>
              </p>
            ) : (
              <p className="application-error-message">
                No job selected. Return to search and click Apply Now on an open role.
              </p>
            )}
          </div>

          <div className="job-application-card glass-card">
            {selectedJob ? (
              <div className="job-application-role-card">
                <div className="role-card-company-icon">
                  <Building size={20} />
                </div>
                <div>
                  <span className="role-company">{selectedJob.company}</span>
                  <h2>{selectedJob.title}</h2>
                  <p className="role-location">{selectedJob.location} &bull; {selectedJob.salary}</p>
                </div>
              </div>
            ) : null}

            <form ref={formRef} className="job-application-form" onSubmit={handleSubmit}>
              {/* File Upload Dropzone */}
              <div className="form-section-title">
                <FileText size={18} />
                <span>1. Resume Attachment & Auto-Fill</span>
              </div>

              <div className="dropzone-box">
                <input
                  id="resumeUpload"
                  name="resume_attachment"
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleResumeFileChange}
                  required
                  className="file-input-hidden"
                />
                <label htmlFor="resumeUpload" className="dropzone-label">
                  {isResumeProcessing ? (
                    <Loader2 size={32} className="spin-icon" />
                  ) : (
                    <UploadCloud size={32} className="upload-icon" />
                  )}
                  <div className="dropzone-text">
                    <strong>{resumeFile ? resumeFile.name : "Click or drag resume here"}</strong>
                    <span>PDF or DOCX format (Max 10MB)</span>
                  </div>
                </label>

                {isResumeProcessing && resumeProcessingStage ? (
                  <div className="processing-status-bar">
                    <Loader2 size={16} className="spin-icon" />
                    <span>{resumeProcessingStage}</span>
                  </div>
                ) : null}

                {resumeMessage ? (
                  <div
                    className={`status-message-banner ${
                      resumeMessageType === "success" ? "success" : "error"
                    }`}
                  >
                    {resumeMessageType === "success" ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <AlertCircle size={18} />
                    )}
                    <span>{resumeMessage}</span>
                  </div>
                ) : null}

                {parsedResume?.atsScore !== null && parsedResume?.atsScore !== undefined && (
                  <div className="ats-score-pill">
                    <CheckCircle2 size={16} className="ats-check" />
                    <span>ATS Match Score: <strong>{parsedResume.atsScore}%</strong></span>
                  </div>
                )}
              </div>

              {/* Personal Details */}
              <div className="form-section-title">
                <User size={18} />
                <span>2. Personal & Contact Information</span>
              </div>

              <div className="application-field">
                <label htmlFor="applicantName">Full Name *</label>
                <input
                  id="applicantName"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. John Doe"
                  required
                />
              </div>

              <div className="form-row-grid">
                <div className="application-field">
                  <label htmlFor="applicantPhone">Phone Number *</label>
                  <input
                    id="applicantPhone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    minLength={10}
                    maxLength={10}
                    title="Phone number must be exactly 10 digits"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    required
                  />
                  {phoneError ? <p className="field-error-text">{phoneError}</p> : null}
                </div>

                <div className="application-field">
                  <label htmlFor="applicantEmail">Email Address *</label>
                  <input
                    id="applicantEmail"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@domain.com"
                    required
                  />
                </div>
              </div>

              {/* Experience Info */}
              <div className="form-section-title">
                <Briefcase size={18} />
                <span>3. Professional Experience</span>
              </div>

              <div className="application-field">
                <label htmlFor="hasPriorExperience">Do you have prior work experience? *</label>
                <select
                  id="hasPriorExperience"
                  name="hasPriorExperience"
                  value={formData.hasPriorExperience}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select option</option>
                  <option value="yes">Yes, I have work experience</option>
                  <option value="no">No, I am a fresher</option>
                </select>
              </div>

              {formData.hasPriorExperience === "yes" ? (
                <div className="application-experience-block">
                  <div className="application-field">
                    <label htmlFor="experienceIndustry">Industry Sector *</label>
                    <select
                      id="experienceIndustry"
                      name="experienceIndustry"
                      value={formData.experienceIndustry}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select industry</option>
                      <option value="it">Information Technology (IT)</option>
                      <option value="marketing">Digital Marketing</option>
                      <option value="sales">Sales & Business Dev</option>
                      <option value="finance">Finance & Accounting</option>
                      <option value="others">Others</option>
                    </select>
                  </div>

                  {formData.experienceIndustry === "others" ? (
                    <div className="application-field">
                      <label htmlFor="experienceIndustryOther">Please specify industry *</label>
                      <input
                        id="experienceIndustryOther"
                        name="experienceIndustryOther"
                        type="text"
                        value={formData.experienceIndustryOther}
                        onChange={handleChange}
                        placeholder="Enter industry name"
                        required
                      />
                    </div>
                  ) : null}

                  <div className="form-row-grid">
                    <div className="application-field">
                      <label htmlFor="currentSalary">Current Salary (LPA / Annual) *</label>
                      <input
                        id="currentSalary"
                        name="currentSalary"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.currentSalary}
                        onChange={handleChange}
                        placeholder="e.g. 6.5"
                        required
                      />
                    </div>

                    <div className="application-field">
                      <label htmlFor="expectedSalary">Expected Salary (LPA / Annual) *</label>
                      <input
                        id="expectedSalary"
                        name="expectedSalary"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.expectedSalary}
                        onChange={handleChange}
                        placeholder="e.g. 9.0"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row-grid">
                    <div className="application-field">
                      <label htmlFor="noticePeriod">Notice Period *</label>
                      <input
                        id="noticePeriod"
                        name="noticePeriod"
                        type="text"
                        value={formData.noticePeriod}
                        onChange={handleChange}
                        placeholder="Immediate / 30 Days"
                        required
                      />
                    </div>

                    <div className="application-field">
                      <label htmlFor="yearsOfExperience">Years of Experience *</label>
                      <input
                        id="yearsOfExperience"
                        name="yearsOfExperience"
                        type="number"
                        min="0"
                        step="0.1"
                        value={formData.yearsOfExperience}
                        onChange={handleChange}
                        placeholder="e.g. 3.5"
                        required
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Education Section */}
              <div className="form-section-title">
                <GraduationCap size={18} />
                <span>4. Education & Background</span>
              </div>

              <div className="application-field">
                <label htmlFor="latestEducationLevel">Highest Completed Qualification *</label>
                <select
                  id="latestEducationLevel"
                  name="latestEducationLevel"
                  value={formData.latestEducationLevel}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select qualification</option>
                  <option value="10th">10th Standard</option>
                  <option value="12th">12th Standard</option>
                  <option value="bachelors">Bachelor's Degree</option>
                  <option value="masters">Master's Degree / Doctorate</option>
                </select>
              </div>

              <div className="form-row-grid">
                <div className="application-field">
                  <label htmlFor="boardUniversity">Board / University *</label>
                  <input
                    id="boardUniversity"
                    name="boardUniversity"
                    type="text"
                    value={formData.boardUniversity}
                    onChange={handleChange}
                    placeholder="University name"
                    required
                  />
                </div>

                <div className="application-field">
                  <label htmlFor="institutionName">School / College *</label>
                  <input
                    id="institutionName"
                    name="institutionName"
                    type="text"
                    value={formData.institutionName}
                    onChange={handleChange}
                    placeholder="Institute name"
                    required
                  />
                </div>
              </div>

              <div className="application-field">
                <label htmlFor="applicantAge">Age (Years) *</label>
                <input
                  id="applicantAge"
                  name="age"
                  type="number"
                  min="16"
                  max="100"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="e.g. 24"
                  required
                />
              </div>

              <div className="application-actions">
                <button
                  type="submit"
                  className="btn btn-primary btn-submit-app"
                  disabled={isResumeProcessing}
                >
                  {isResumeProcessing ? (
                    <>
                      <Loader2 size={18} className="spin-icon" />
                      <span>{resumeProcessingStage || "Processing..."}</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Application</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </form>

            {submitted ? (
              <div className="submission-banner success">
                <CheckCircle2 size={24} />
                <div>
                  <h4>Application Received!</h4>
                  <p>{submitMessage}</p>
                </div>
              </div>
            ) : null}

            {submitMessage && !submitted ? (
              <div className="submission-banner error">
                <AlertCircle size={24} />
                <div>
                  <h4>Submission Error</h4>
                  <p>{submitMessage}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

