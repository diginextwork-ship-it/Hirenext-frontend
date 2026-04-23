import { useEffect, useRef, useState } from "react";
import { checkRecruiterJobAccess, submitRecruiterResume } from "../../services/jobAccessService";
import { API_BASE_URL, BACKEND_CONNECTION_ERROR } from "../../config/api";
import { useNotification } from "../../context/NotificationContext";

const RESUME_SOURCE_OPTIONS = [
  "Naukri",
  "Indeed",
  "Shine",
  "Reference",
  "Apna Job",
  "Job Hai",
  "Work India",
  "LinkedIn",
  "Internal Database",
];

const EDUCATION_LEVEL_OPTIONS = ["Undergraduate", "Bachelor's", "Master's", "PhD"];

const initialFormState = {
  candidate_name: "",
  phone: "",
  email: "",
  candidate_location: "",
  office_location_option: "jd",
  office_location_city: "",
  source: "",
  latest_education_level: "",
  board_university: "",
  institution_name: "",
  age: "",
  submitted_reason: "",
  resume_file: null,
};

const allowedFilePattern = /\.(pdf|doc|docx)$/i;

const mergeRecruiterOverridesIntoParsedData = (parsedData, formData) => {
  const safeParsedData =
    parsedData && typeof parsedData === "object" && !Array.isArray(parsedData)
      ? { ...parsedData }
      : {};
  const educationSource =
    Array.isArray(safeParsedData.education) && safeParsedData.education.length > 0
      ? safeParsedData.education[0]
      : safeParsedData.education && typeof safeParsedData.education === "object"
        ? safeParsedData.education
        : {};
  const mergedEducation = { ...educationSource };

  const candidateName = String(formData.candidate_name || "").trim();
  const candidatePhone = String(formData.phone || "").replace(/\D/g, "").slice(0, 10);
  const candidateEmail = String(formData.email || "").trim().toLowerCase();
  const latestEducationLevel = String(formData.latest_education_level || "").trim();
  const boardUniversity = String(formData.board_university || "").trim();
  const institutionName = String(formData.institution_name || "").trim();
  const age = String(formData.age || "").trim();

  if (candidateName) {
    safeParsedData.full_name = candidateName;
    safeParsedData.fullName = candidateName;
    safeParsedData.name = candidateName;
    safeParsedData.candidate_name = candidateName;
    safeParsedData.candidateName = candidateName;
    safeParsedData.applicant_name = candidateName;
    safeParsedData.applicantName = candidateName;
  }

  if (candidatePhone) {
    safeParsedData.phone = candidatePhone;
    safeParsedData.phone_number = candidatePhone;
    safeParsedData.phoneNumber = candidatePhone;
    safeParsedData.mobile = candidatePhone;
    safeParsedData.mobile_number = candidatePhone;
    safeParsedData.mobileNumber = candidatePhone;
  }

  if (candidateEmail) {
    safeParsedData.email = candidateEmail;
    safeParsedData.mail = candidateEmail;
    safeParsedData.candidate_email = candidateEmail;
    safeParsedData.candidateEmail = candidateEmail;
    safeParsedData.applicant_email = candidateEmail;
    safeParsedData.applicantEmail = candidateEmail;
  }

  if (latestEducationLevel) {
    mergedEducation.latest_education_level = latestEducationLevel;
    mergedEducation.latestEducationLevel = latestEducationLevel;
    mergedEducation.education_level = latestEducationLevel;
    mergedEducation.degree = latestEducationLevel;
    mergedEducation.qualification = latestEducationLevel;
  }

  if (boardUniversity) {
    mergedEducation.board_university = boardUniversity;
    mergedEducation.boardUniversity = boardUniversity;
    mergedEducation.university = boardUniversity;
    mergedEducation.university_name = boardUniversity;
    mergedEducation.board = boardUniversity;
  }

  if (institutionName) {
    mergedEducation.institution_name = institutionName;
    mergedEducation.institutionName = institutionName;
    mergedEducation.college_name = institutionName;
    mergedEducation.college = institutionName;
    mergedEducation.school_name = institutionName;
    mergedEducation.school = institutionName;
  }

  if (age) {
    safeParsedData.age = age;
  }

  if (Object.keys(mergedEducation).length > 0) {
    safeParsedData.education = [mergedEducation];
  }

  return Object.keys(safeParsedData).length > 0 ? safeParsedData : null;
};

export default function ResumeSubmissionModal({
  recruiterId,
  jobId,
  job,
  isOpen,
  onClose,
  onSuccess,
}) {
  const { addNotification } = useNotification();
  const [hasAccess, setHasAccess] = useState(null);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [isResumeProcessing, setIsResumeProcessing] = useState(false);
  const [resumeProcessingStage, setResumeProcessingStage] = useState("");
  const [parseMessage, setParseMessage] = useState("");
  const [parseMessageType, setParseMessageType] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState(initialFormState);
  const [resumeBase64, setResumeBase64] = useState("");
  const [parsedPayload, setParsedPayload] = useState(null);
  const activeResumeRequestIdRef = useRef(0);

  useEffect(() => {
    if (!isOpen || !jobId || !recruiterId) return;
    let active = true;

    const loadAccess = async () => {
      setCheckingAccess(true);
      setErrorMessage("");
      try {
        const data = await checkRecruiterJobAccess(recruiterId, jobId);
        if (!active) return;
        setHasAccess(Boolean(data?.canAccess));
        if (!data?.canAccess) setErrorMessage(data?.reason || "Access denied for this job.");
      } catch (error) {
        if (!active) return;
        setHasAccess(false);
        setErrorMessage(error.message || "Failed to validate job access.");
      } finally {
        if (active) setCheckingAccess(false);
      }
    };

    loadAccess();
    return () => {
      active = false;
    };
  }, [isOpen, recruiterId, jobId]);

  useEffect(() => {
    if (!isOpen) {
      activeResumeRequestIdRef.current += 1;
      setFormData(initialFormState);
      setHasAccess(null);
      setCheckingAccess(false);
      setIsResumeProcessing(false);
      setResumeProcessingStage("");
      setParseMessage("");
      setParseMessageType("");
      setErrorMessage("");
      setResumeBase64("");
      setParsedPayload(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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

  const setField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateFile = (file) => {
    if (!file) return "Please upload a resume file.";
    if (!allowedFilePattern.test(file.name || "")) {
      return "Only PDF, DOC, DOCX files are allowed.";
    }
    if (file.size > 5 * 1024 * 1024) {
      return "Resume file size must be 5MB or less.";
    }
    return "";
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read resume file."));
      reader.readAsDataURL(file);
    });

  const parseResumeAndAutofill = async (file, options = {}) => {
    if (!file || !jobId) return null;

    const requestId = options.requestId ?? beginResumeRequest("Parsing resume...");
    const shouldReleaseLock = options.requestId === undefined;
    setParseMessage("");
    setParseMessageType("");

    try {
      const encodedResume = options.resumeBase64 ?? (await fileToDataUrl(file));
      if (activeResumeRequestIdRef.current !== requestId) {
        return null;
      }

      updateResumeRequestStage(requestId, "Calculating ATS score...");
      const jid = String(jobId || "").trim();
      const response = await fetch(`${API_BASE_URL}/api/applications/parse-resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jid,
          resumeBase64: encodedResume,
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
        candidate_name: autofill.name || prev.candidate_name,
        phone: String(autofill.phone || prev.phone).replace(/\D/g, "").slice(0, 10),
        email: autofill.email || prev.email,
        latest_education_level: EDUCATION_LEVEL_OPTIONS.includes(autofill.latestEducationLevel)
          ? autofill.latestEducationLevel
          : prev.latest_education_level,
        board_university: autofill.boardUniversity || prev.board_university,
        institution_name: autofill.institutionName || prev.institution_name,
        age: autofill.age || prev.age,
      }));
      setParseMessageType("success");
      setParseMessage("Resume parsed and form auto-filled successfully.");
      setParsedPayload({
        parsedData: data?.parsedData || null,
        atsScore: data?.atsScore ?? null,
        atsMatchPercentage: data?.atsMatchPercentage ?? null,
        atsRawJson: data?.atsRawJson || null,
        parserMeta: data?.parser_meta || null,
        processing: data?.processing || null,
      });
      return {
        parsedData: data?.parsedData || null,
        atsScore: data?.atsScore ?? null,
        atsMatchPercentage: data?.atsMatchPercentage ?? null,
        atsRawJson: data?.atsRawJson || null,
        parserMeta: data?.parser_meta || null,
        processing: data?.processing || null,
      };
    } catch (error) {
      if (activeResumeRequestIdRef.current !== requestId) {
        return null;
      }

      setParseMessageType("error");
      if (error instanceof TypeError) {
        setParseMessage(BACKEND_CONNECTION_ERROR);
      } else {
        setParseMessage(error.message || "Resume parsing failed.");
      }
      setParsedPayload(null);
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
    setErrorMessage("");
    setParseMessage("");
    setParseMessageType("");
    setField("resume_file", file);
    setResumeBase64("");
    setParsedPayload(null);

    if (!file) return;
    const fileError = validateFile(file);
    if (fileError) {
      setErrorMessage(fileError);
      return;
    }

    const requestId = beginResumeRequest("Parsing resume...");
    try {
      const encodedResume = await fileToDataUrl(file);
      if (activeResumeRequestIdRef.current !== requestId) {
        return;
      }
      setResumeBase64(encodedResume);
      await parseResumeAndAutofill(file, { requestId, resumeBase64: encodedResume });
    } catch (error) {
      setErrorMessage(error.message || "Failed to read resume file.");
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
    setErrorMessage("");

    try {
      if (!hasAccess) {
        setErrorMessage("You don't have permission to submit resumes for this job.");
        return;
      }

      const fileError = validateFile(formData.resume_file);
      if (fileError) {
        setErrorMessage(fileError);
        return;
      }

      const jid = String(jobId || "").trim();
      const officeLocationCity = String(
        formData.office_location_option === "manual" ? formData.office_location_city : "",
      ).trim();
      if (formData.office_location_option === "manual" && !officeLocationCity) {
        setErrorMessage("Please enter the office city name.");
        return;
      }
      let currentResumeBase64 = resumeBase64;
      let currentParsedPayload = parsedPayload;

      if (!currentResumeBase64 && formData.resume_file) {
        updateResumeRequestStage(requestId, "Parsing resume...");
        currentResumeBase64 = await fileToDataUrl(formData.resume_file);
        if (activeResumeRequestIdRef.current !== requestId) {
          return;
        }
        setResumeBase64(currentResumeBase64);
      }

      if (!currentParsedPayload && formData.resume_file) {
        currentParsedPayload = await parseResumeAndAutofill(formData.resume_file, {
          requestId,
          resumeBase64: currentResumeBase64,
        });
        if (!currentParsedPayload) {
          if (activeResumeRequestIdRef.current === requestId) {
            setErrorMessage("Resume parsing failed. Please re-upload and try again.");
          }
          return;
        }
      }

      if (!jid || !formData.resume_file) {
        setErrorMessage("A valid job and resume file are required.");
        return;
      }

      updateResumeRequestStage(requestId, "Submitting...");
      const payload = new FormData();
      payload.append("job_jid", String(jobId));
      payload.append("recruiter_rid", String(recruiterId));
      payload.append("jid", jid);
      const candidateName = String(formData.candidate_name || "").trim();
      const candidateEmail = String(formData.email || "").trim();
      const candidatePhone = String(formData.phone || "").trim();
      if (candidateName) {
        payload.append("candidate_name", candidateName);
        payload.append("candidateName", candidateName);
        payload.append("applicant_name", candidateName);
        payload.append("applicantName", candidateName);
        payload.append("name", candidateName);
      }
      if (candidateEmail) {
        payload.append("candidate_email", candidateEmail);
        payload.append("candidateEmail", candidateEmail);
        payload.append("applicant_email", candidateEmail);
        payload.append("applicantEmail", candidateEmail);
        payload.append("email", candidateEmail);
      }
      if (candidatePhone) {
        payload.append("candidate_phone", candidatePhone);
        payload.append("candidatePhone", candidatePhone);
        payload.append("phone", candidatePhone);
        payload.append("phone_number", candidatePhone);
        payload.append("phoneNumber", candidatePhone);
        payload.append("mobile", candidatePhone);
        payload.append("mobile_number", candidatePhone);
        payload.append("mobileNumber", candidatePhone);
      }
      const mergedParsedData = mergeRecruiterOverridesIntoParsedData(
        currentParsedPayload?.parsedData || null,
        formData,
      );
      if (currentParsedPayload) {
        if (mergedParsedData) {
          payload.append("parsedData", JSON.stringify(mergedParsedData));
        }
        if (currentParsedPayload.atsScore !== null && currentParsedPayload.atsScore !== undefined) {
          payload.append("atsScore", String(currentParsedPayload.atsScore));
        }
        if (
          currentParsedPayload.atsMatchPercentage !== null &&
          currentParsedPayload.atsMatchPercentage !== undefined
        ) {
          payload.append("atsMatchPercentage", String(currentParsedPayload.atsMatchPercentage));
        }
        if (currentParsedPayload.atsRawJson) {
          payload.append("atsRawJson", JSON.stringify(currentParsedPayload.atsRawJson));
        }
      } else if (mergedParsedData) {
        payload.append("parsedData", JSON.stringify(mergedParsedData));
      }
      Object.entries(formData).forEach(([key, value]) => {
        if (key === "resume_file") {
          payload.append(key, value);
          return;
        }
        if (key === "candidate_name" || key === "phone") {
          return;
        }
        payload.append(key, String(value ?? "").trim());
      });

      const data = await submitRecruiterResume(payload);
      if (activeResumeRequestIdRef.current !== requestId) {
        return;
      }
      if (data?.processing && data.processing.submitAllowed !== true) {
        throw new Error(data?.message || "Resume submission is not complete yet.");
      }

      const companyName = String(
        job?.company_name || data?.company_name || data?.companyName || "Unknown company",
      ).trim();
      const companyDisplay = officeLocationCity
        ? `${companyName}, ${officeLocationCity}`
        : companyName;
      addNotification(
        `Candidate submitted successfully for ${companyDisplay}. Phone: ${candidatePhone || "N/A"}`,
        "success",
        5000,
      );
      onSuccess?.(data);
      onClose?.();
    } catch (error) {
      if (activeResumeRequestIdRef.current !== requestId) {
        return;
      }
      setErrorMessage(error.message || "Failed to submit resume.");
    } finally {
      finishResumeRequest(requestId);
    }
  };

  return (
    <div className="resume-modal-overlay" role="presentation">
      <div className="resume-modal" role="dialog" aria-modal="true" aria-labelledby="resume-modal-title">
        <div className="resume-modal-header">
          <h2 id="resume-modal-title">Submit Resume</h2>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        {checkingAccess ? <p>Checking access...</p> : null}
        {!checkingAccess && hasAccess === false ? (
          <p className="job-message job-message-error">{errorMessage || "Access denied."}</p>
        ) : null}

        {!checkingAccess && hasAccess ? (
          <form className="resume-modal-form" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Candidate Name"
              value={formData.candidate_name}
              onChange={(event) => setField("candidate_name", event.target.value)}
              required
            />
            <input
              type="tel"
              placeholder="Phone"
              value={formData.phone}
              onChange={(event) => setField("phone", event.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(event) => setField("email", event.target.value)}
              required
            />
            <div className="resume-modal-field">
              <label htmlFor="candidate_location">Candidate Current Location</label>
              <input
                id="candidate_location"
                type="text"
                placeholder="Candidate Current Location"
                value={formData.candidate_location}
                onChange={(event) => setField("candidate_location", event.target.value)}
              />
            </div>
            <div className="resume-modal-field">
              <label htmlFor="office_location_option">Office Location</label>
              <select
                id="office_location_option"
                value={formData.office_location_option}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    office_location_option: nextValue,
                    office_location_city:
                      nextValue === "manual" ? prev.office_location_city : "",
                  }));
                }}
                required
              >
                <option value="jd">Already specified in the JD</option>
                <option value="manual">Enter manually</option>
              </select>
            </div>
            {formData.office_location_option === "manual" ? (
              <div className="resume-modal-field">
                <label htmlFor="office_location_city">City Name</label>
                <input
                  id="office_location_city"
                  type="text"
                  placeholder="Enter office city"
                  value={formData.office_location_city}
                  onChange={(event) => setField("office_location_city", event.target.value)}
                  required
                />
              </div>
            ) : null}
            <select
              value={formData.source}
              onChange={(event) => setField("source", event.target.value)}
              required
            >
              <option value="">Resume Source</option>
              {RESUME_SOURCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              value={formData.latest_education_level}
              onChange={(event) => setField("latest_education_level", event.target.value)}
              required
            >
              <option value="">Education Level</option>
              {EDUCATION_LEVEL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Institution Name"
              value={formData.institution_name}
              onChange={(event) => setField("institution_name", event.target.value)}
              required
            />
            <input
              type="number"
              min="18"
              max="100"
              placeholder="Age"
              value={formData.age}
              onChange={(event) => setField("age", event.target.value)}
              required
            />
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleResumeFileChange}
              required
            />
            <div className="resume-modal-field">
              <label htmlFor="submitted_reason">Any brief about candidate&apos;s availability?</label>
              <textarea
                id="submitted_reason"
                placeholder="Add a short availability note"
                value={formData.submitted_reason}
                onChange={(event) => setField("submitted_reason", event.target.value)}
                rows={3}
              />
            </div>
            {isResumeProcessing && resumeProcessingStage ? <p>{resumeProcessingStage}</p> : null}
            {parseMessage ? (
              <p className={parseMessageType === "success" ? "job-message" : "job-message job-message-error"}>
                {parseMessage}
              </p>
            ) : null}

            <div className="resume-modal-actions">
              <button type="submit" className="btn-primary" disabled={isResumeProcessing}>
                {isResumeProcessing && resumeProcessingStage
                  ? resumeProcessingStage
                  : "Submit Resume"}
              </button>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {errorMessage && hasAccess !== false ? (
          <p className="job-message job-message-error">{errorMessage}</p>
        ) : null}
      </div>
    </div>
  );
}
