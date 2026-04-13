import { useEffect, useRef, useState } from "react";
import emailjs from "@emailjs/browser";
import "../styles/job-application.css";
import { API_BASE_URL, BACKEND_CONNECTION_ERROR } from "../config/api";
import PageBackButton from "../components/PageBackButton";
import { getEmailJsConfig, isEmailJsConfigured } from "../utils/emailjs";
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
  const { serviceId, publicKey, jobApplicationTemplateId } = getEmailJsConfig();

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

      updateResumeRequestStage(requestId, "Calculating ATS score...");
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
      setResumeMessage("Resume parsed and form auto-filled successfully.");
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

    const requestId = beginResumeRequest("Submitting...");
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
      updateResumeRequestStage(requestId, "Submitting...");
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

      if (!isEmailJsConfigured(jobApplicationTemplateId)) {
        throw new Error(
          "Application saved, but EmailJS is not configured. Please add the EmailJS environment variables.",
        );
      }

      updateResumeRequestStage(requestId, "Sending email...");
      await emailjs.sendForm(serviceId, jobApplicationTemplateId, formRef.current, {
        publicKey,
      });

      setSubmitted(true);
      setSubmitMessage("Application submitted successfully and emailed to HireNext.");
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
            <span className="job-application-kicker">Job Application Form</span>
            <h1>Complete the form below to submit your application.</h1>
            {isJobLoading ? (
              <p>Loading selected job details...</p>
            ) : selectedJob ? (
              <p>
                Applying for <strong>{selectedJob.title}</strong> at{" "}
                <strong>{selectedJob.company}</strong>
              </p>
            ) : (
              <p className="application-error-message">
                No job selected. Use Back to jobs and click Apply now on a job.
              </p>
            )}
          </div>

          <div className="job-application-card">
            {selectedJob ? (
              <div className="job-application-role-card">
                <span>{selectedJob.company}</span>
                <h2>{selectedJob.title}</h2>
                <p>{selectedJob.location}</p>
              </div>
            ) : null}

            <form ref={formRef} className="job-application-form" onSubmit={handleSubmit}>
            <input type="hidden" name="form_type" value="Job Application" />
            <input type="hidden" name="to_email" value="Hirenextindia@gmail.com" />
            <input type="hidden" name="job_id" value={selectedJobId} />
            <input type="hidden" name="job_title" value={selectedJob?.title || ""} />
            <input type="hidden" name="company_name" value={selectedJob?.company || ""} />
            <input type="hidden" name="job_location" value={selectedJob?.location || ""} />
            <div className="application-field">
              <label htmlFor="resumeUpload">Upload resume (PDF/DOCX) *</label>
              <input
                id="resumeUpload"
                name="resume_attachment"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleResumeFileChange}
                required
              />
              {isResumeProcessing && resumeProcessingStage ? (
                <p>{resumeProcessingStage}</p>
              ) : null}
              {resumeMessage ? (
                <p
                  className={
                    resumeMessageType === "success"
                      ? "application-success-message"
                      : "application-error-message"
                  }
                >
                  {resumeMessage}
                </p>
              ) : null}
            </div>

            <div className="application-field">
              <label htmlFor="applicantName">Name *</label>
              <input
                id="applicantName"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="application-field">
              <label htmlFor="applicantPhone">Phone *</label>
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
                placeholder="Enter 10-digit phone number"
                required
              />
              {phoneError ? <p className="application-error-message">{phoneError}</p> : null}
            </div>

            <div className="application-field">
              <label htmlFor="applicantEmail">Email *</label>
              <input
                id="applicantEmail"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="application-field">
              <label htmlFor="hasPriorExperience">Do you have any prior experience? *</label>
              <select
                id="hasPriorExperience"
                name="hasPriorExperience"
                value={formData.hasPriorExperience}
                onChange={handleChange}
                required
              >
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            {formData.hasPriorExperience === "yes" ? (
              <div className="application-experience-block">
                <div className="application-field">
                  <label htmlFor="experienceIndustry">Industry *</label>
                  <select
                    id="experienceIndustry"
                    name="experienceIndustry"
                    value={formData.experienceIndustry}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select industry</option>
                    <option value="it">IT</option>
                    <option value="marketing">Marketing</option>
                    <option value="sales">Sales</option>
                    <option value="finance">Finance</option>
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

                <div className="application-grid">
                  <div className="application-field">
                    <label htmlFor="currentSalary">Current salary *</label>
                    <input
                      id="currentSalary"
                      name="currentSalary"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.currentSalary}
                      onChange={handleChange}
                      placeholder="Enter current salary"
                      required
                    />
                  </div>

                  <div className="application-field">
                    <label htmlFor="expectedSalary">Expected salary *</label>
                    <input
                      id="expectedSalary"
                      name="expectedSalary"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.expectedSalary}
                      onChange={handleChange}
                      placeholder="Enter expected salary"
                      required
                    />
                  </div>
                </div>

                <div className="application-grid">
                  <div className="application-field">
                    <label htmlFor="noticePeriod">Notice period *</label>
                    <input
                      id="noticePeriod"
                      name="noticePeriod"
                      type="text"
                      value={formData.noticePeriod}
                      onChange={handleChange}
                      placeholder="Immediate / 30 days / 60 days"
                      required
                    />
                  </div>

                  <div className="application-field">
                    <label htmlFor="yearsOfExperience">Years of experience *</label>
                    <input
                      id="yearsOfExperience"
                      name="yearsOfExperience"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.yearsOfExperience}
                      onChange={handleChange}
                      placeholder="Enter years of experience"
                      required
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <div className="application-field">
              <label htmlFor="latestEducationLevel">Add your latest education *</label>
              <select
                id="latestEducationLevel"
                name="latestEducationLevel"
                value={formData.latestEducationLevel}
                onChange={handleChange}
                required
              >
                <option value="">Select highest level of completed education</option>
                <option value="10th">10th</option>
                <option value="12th">12th</option>
                <option value="bachelors">Bachelors</option>
                <option value="masters">Masters</option>
              </select>
            </div>

            <div className="application-field">
              <label htmlFor="boardUniversity">Enter your board/university *</label>
              <input
                id="boardUniversity"
                name="boardUniversity"
                type="text"
                value={formData.boardUniversity}
                onChange={handleChange}
                placeholder="Board or university name"
                required
              />
            </div>

            <div className="application-field">
              <label htmlFor="institutionName">Enter school/college name *</label>
              <input
                id="institutionName"
                name="institutionName"
                type="text"
                value={formData.institutionName}
                onChange={handleChange}
                placeholder="School or college name"
                required
              />
            </div>

            <div className="application-field">
              <label htmlFor="applicantAge">Age *</label>
              <input
                id="applicantAge"
                name="age"
                type="number"
                min="16"
                max="100"
                value={formData.age}
                onChange={handleChange}
                placeholder="Enter your age"
                required
              />
            </div>

            <div className="application-actions">
              <button type="submit" className="apply-submit-btn" disabled={isResumeProcessing}>
                {isResumeProcessing && resumeProcessingStage
                  ? resumeProcessingStage
                  : "Submit Application"}
              </button>
            </div>
            </form>

            {submitted ? <p className="application-success-message">Application submitted successfully.</p> : null}
            {submitMessage && !submitted ? <p className="application-error-message">{submitMessage}</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
