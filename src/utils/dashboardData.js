const isPresent = (value) =>
  value !== null && value !== undefined && String(value).trim() !== "";

const pickFirst = (...values) => values.find(isPresent);

export const displayNote = (value) => {
  const normalized = String(value ?? "").trim();
  if (
    !normalized ||
    ["n/a", "na", "not set"].includes(normalized.toLowerCase())
  ) {
    return "-";
  }
  return normalized;
};

export const getWorkflowNoteAuthor = (resume, value) => {
  const note = String(value ?? "").trim();
  const workflowNote = String(resume?.workflowNote ?? "").trim();
  if (!note || !workflowNote || note !== workflowNote) return "";
  return resume?.workflowUpdatedByName || "";
};

export const getCurrentStatusNote = (resume) => {
  const status = String(resume?.workflowStatus || resume?.status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const noteByStatus = {
    verified: resume?.verifiedReason,
    others: resume?.othersReason,
    walk_in: resume?.walkInReason,
    shortlisted: resume?.shortlistedReason || resume?.pendingJoiningReason,
    pending_joining: resume?.shortlistedReason || resume?.pendingJoiningReason,
    selected: resume?.selectReason,
    rejected: resume?.rejectReason,
    joined: resume?.joiningNote || resume?.joinedReason,
    dropout: resume?.dropoutReason,
    billed: resume?.billedReason,
    left: resume?.leftReason,
  };
  return noteByStatus[status] || resume?.workflowNote || "";
};

const normalizeDisplayText = (value) => {
  if (Array.isArray(value)) {
    const uniqueValues = [];
    for (const item of value) {
      const normalizedItem = normalizeDisplayText(item);
      if (
        isPresent(normalizedItem) &&
        !uniqueValues.some(
          (existing) =>
            String(existing).trim().toLowerCase() ===
            String(normalizedItem).trim().toLowerCase(),
        )
      ) {
        uniqueValues.push(normalizedItem);
      }
    }
    return uniqueValues[0];
  }

  if (typeof value !== "string") {
    return value;
  }

  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 1) {
    return value.trim();
  }

  const uniqueParts = [];
  for (const part of parts) {
    if (
      !uniqueParts.some(
        (existing) => existing.trim().toLowerCase() === part.toLowerCase(),
      )
    ) {
      uniqueParts.push(part);
    }
  }

  return uniqueParts.join(", ");
};

const pickNested = (source, paths) => {
  for (const path of paths) {
    const parts = String(path).split(".");
    let current = source;
    let found = true;
    for (const part of parts) {
      if (current && Object.prototype.hasOwnProperty.call(current, part)) {
        current = current[part];
      } else {
        found = false;
        break;
      }
    }
    if (found && isPresent(current)) return current;
  }
  return undefined;
};

export const normalizeJobData = (job) => {
  const source = job || {};
  const jid = pickNested(source, [
    "jid",
    "jobJid",
    "job_id",
    "jobId",
    "id",
    "jobID",
  ]);
  const companyName = pickNested(source, [
    "companyName",
    "company_name",
    "company",
    "companyTitle",
    "company_title",
    "employerName",
    "employer_name",
    "organizationName",
    "organization_name",
    "jobCompany",
    "job_company",
    "clientName",
    "client_name",
  ]);
  const roleName = pickNested(source, [
    "roleName",
    "role_name",
    "title",
    "jobTitle",
    "job_title",
    "jobRole",
    "job_role",
    "position",
    "designation",
  ]);
  const city = pickNested(source, [
    "city",
    "jobCity",
    "job_city",
    "location",
    "location_city",
    "locationCity",
    "jobLocation",
    "job_location",
    "currentCity",
    "current_city",
  ]);

  return {
    ...source,
    jid: pickFirst(jid, source.jid),
    jobJid: pickFirst(source.jobJid, jid),
    companyName: pickFirst(source.companyName, companyName),
    company_name: pickFirst(source.company_name, companyName),
    roleName: pickFirst(source.roleName, roleName),
    role_name: pickFirst(source.role_name, roleName),
    city: pickFirst(source.city, city),
  };
};

export const normalizeResumeData = (resume, fallbackJob = null) => {
  const source = resume || {};
  const selection = source.selection || {};
  const nestedJob = normalizeJobData(
    pickFirst(
      source.job,
      source.jobDetails,
      source.job_details,
      source.job_data,
      source.jobData,
      source.jobInfo,
      source.job_info,
      source.selectedJob,
      fallbackJob,
    ) || {},
  );
  const nestedCandidate = pickFirst(
    source.candidate,
    source.applicant,
    source.candidateDetails,
    source.candidate_data,
    {},
  );

  const candidateName = normalizeDisplayText(
    pickFirst(
      pickNested(source, [
        "candidateName",
        "candidate_name",
        "applicantName",
        "applicant_name",
        "name",
        "fullName",
        "full_name",
      ]),
      pickNested(nestedCandidate, [
        "candidateName",
        "candidate_name",
        "applicantName",
        "applicant_name",
        "name",
        "fullName",
        "full_name",
      ]),
    ),
  );
  const candidateEmail = pickFirst(
    pickNested(source, [
      "candidateEmail",
      "candidate_email",
      "applicantEmail",
      "applicant_email",
      "email",
      "mail",
    ]),
    pickNested(nestedCandidate, [
      "candidateEmail",
      "candidate_email",
      "applicantEmail",
      "applicant_email",
      "email",
      "mail",
    ]),
  );
  const candidatePhone = pickFirst(
    pickNested(source, [
      "candidatePhone",
      "candidate_phone",
      "applicantPhone",
      "applicant_phone",
      "phone",
      "mobile",
      "phoneNumber",
      "phone_number",
      "mobileNumber",
      "mobile_number",
      "contactNumber",
      "contact_number",
    ]),
    pickNested(nestedCandidate, [
      "candidatePhone",
      "candidate_phone",
      "applicantPhone",
      "applicant_phone",
      "phone",
      "mobile",
      "phoneNumber",
      "phone_number",
      "mobileNumber",
      "mobile_number",
      "contactNumber",
      "contact_number",
    ]),
  );
  const resolvedCandidateName = normalizeDisplayText(
    pickFirst(source.candidateName, candidateName),
  );
  const resolvedApplicantName = normalizeDisplayText(
    pickFirst(source.applicantName, resolvedCandidateName),
  );
  const resolvedName = normalizeDisplayText(
    pickFirst(source.name, resolvedCandidateName),
  );
  const recruiterName = pickNested(source, [
    "recruiterName",
    "recruiter_name",
    "uploadedByName",
  ]);
  const recruiterEmail = pickNested(source, [
    "recruiterEmail",
    "recruiter_email",
    "uploadedByEmail",
  ]);
  const rid = pickNested(source, ["rid", "recruiterRid", "recruiter_rid"]);
  const resId = pickFirst(
    pickNested(source, ["resId", "res_id", "resumeId", "resume_id"]),
    pickNested(selection, ["resId", "res_id", "resumeId", "resume_id"]),
  );
  const status = pickFirst(
    pickNested(source, ["workflowStatus", "workflow_status"]),
    pickNested(source, ["currentStatus", "current_status"]),
    pickNested(selection, ["status", "selection_status"]),
    pickNested(source, ["status"]),
  );
  const currentStatus = pickFirst(
    pickNested(source, ["currentStatus", "current_status"]),
    pickNested(source, ["workflowStatus", "workflow_status"]),
    pickNested(selection, ["currentStatus", "current_status"]),
    pickNested(selection, ["status", "selection_status"]),
    pickNested(source, ["status"]),
  );
  const genericReason = pickFirst(
    pickNested(source, [
      "reason",
      "note",
      "workflowNote",
      "workflow_note",
      "selectionNote",
      "selection_note",
    ]),
    pickNested(selection, [
      "reason",
      "note",
      "workflowNote",
      "workflow_note",
      "selectionNote",
      "selection_note",
    ]),
  );
  const walkInDate = pickFirst(
    pickNested(source, ["walkInDate", "walk_in_date"]),
    pickNested(selection, ["walkInDate", "walk_in_date"]),
  );
  const joiningDate = pickFirst(
    pickNested(source, ["joiningDate", "joining_date"]),
    pickNested(selection, ["joiningDate", "joining_date"]),
  );
  const joiningNote = pickFirst(
    pickNested(source, ["joiningNote", "joining_note"]),
    pickNested(selection, ["joiningNote", "joining_note"]),
  );
  const workflowUpdatedAt = pickFirst(
    pickNested(source, ["workflowUpdatedAt", "workflow_updated_at"]),
    pickNested(selection, ["workflowUpdatedAt", "workflow_updated_at"]),
  );
  const updatedAt = pickFirst(
    pickNested(source, ["updatedAt", "updated_at"]),
    pickNested(selection, ["updatedAt", "updated_at"]),
  );
  const createdAt = pickFirst(
    pickNested(source, ["createdAt", "created_at"]),
    pickNested(selection, ["createdAt", "created_at"]),
  );
  const submittedReason = pickFirst(
    pickNested(source, ["submittedReason", "submitted_reason"]),
    pickNested(selection, ["submittedReason", "submitted_reason"]),
  );
  const submittedAt = pickFirst(
    pickNested(source, ["submittedAt", "submitted_at"]),
    pickNested(selection, ["submittedAt", "submitted_at"]),
  );
  const uploadedAt = pickFirst(
    pickNested(source, ["uploadedAt", "uploaded_at"]),
    pickNested(selection, ["uploadedAt", "uploaded_at"]),
  );
  const verifiedReason = pickFirst(
    pickNested(source, ["verifiedReason", "verified_reason"]),
    pickNested(selection, ["verifiedReason", "verified_reason"]),
    status === "verified" ? genericReason : null,
  );
  const verifiedAt = pickFirst(
    pickNested(source, ["verifiedAt", "verified_at"]),
    pickNested(selection, ["verifiedAt", "verified_at"]),
  );
  const othersReason = pickFirst(
    pickNested(source, ["othersReason", "others_reason"]),
    pickNested(selection, ["othersReason", "others_reason"]),
    status === "others" ? genericReason : null,
  );
  const othersAt = pickFirst(
    pickNested(source, ["othersAt", "others_at"]),
    pickNested(selection, ["othersAt", "others_at"]),
  );
  const walkInReason = pickFirst(
    pickNested(source, ["walkInReason", "walk_in_reason"]),
    pickNested(selection, ["walkInReason", "walk_in_reason"]),
    status === "walk_in" ? genericReason : null,
  );
  const walkInAt = pickFirst(
    pickNested(source, ["walkInAt", "walk_in_at"]),
    pickNested(selection, ["walkInAt", "walk_in_at"]),
  );
  const selectReason = pickFirst(
    pickNested(source, [
      "selectReason",
      "select_reason",
      "selectionReason",
      "selection_reason",
    ]),
    pickNested(selection, [
      "selectReason",
      "select_reason",
      "selectionReason",
      "selection_reason",
    ]),
    status === "selected" ? genericReason : null,
  );
  const selectedAt = pickFirst(
    pickNested(source, ["selectedAt", "selected_at"]),
    pickNested(selection, ["selectedAt", "selected_at"]),
  );
  const rejectReason = pickFirst(
    pickNested(source, ["rejectReason", "reject_reason"]),
    pickNested(selection, ["rejectReason", "reject_reason"]),
    status === "rejected" ? genericReason : null,
  );
  const rejectedAt = pickFirst(
    pickNested(source, ["rejectedAt", "rejected_at"]),
    pickNested(selection, ["rejectedAt", "rejected_at"]),
  );
  const shortlistedReason = pickFirst(
    pickNested(source, [
      "shortlistedReason",
      "shortlisted_reason",
      "pendingJoiningReason",
      "pending_joining_reason",
      "pendingReason",
      "pending_reason",
    ]),
    pickNested(selection, [
      "shortlistedReason",
      "shortlisted_reason",
      "pendingJoiningReason",
      "pending_joining_reason",
      "pendingReason",
      "pending_reason",
    ]),
    joiningNote,
    status === "shortlisted" || status === "pending_joining"
      ? genericReason
      : null,
  );
  const shortlistedAt = pickFirst(
    pickNested(source, ["shortlistedAt", "shortlisted_at"]),
    pickNested(selection, ["shortlistedAt", "shortlisted_at"]),
  );
  const joinedReason = pickFirst(
    pickNested(source, ["joinedReason", "joined_reason"]),
    pickNested(selection, ["joinedReason", "joined_reason"]),
    status === "joined" ? genericReason : null,
  );
  const joinedAt = pickFirst(
    pickNested(source, ["joinedAt", "joined_at"]),
    pickNested(selection, ["joinedAt", "joined_at"]),
  );
  const dropoutReason = pickFirst(
    pickNested(source, ["dropoutReason", "dropout_reason", "reason"]),
    pickNested(selection, ["dropoutReason", "dropout_reason", "reason"]),
    status === "dropout" ? genericReason : null,
  );
  const dropoutAt = pickFirst(
    pickNested(source, ["dropoutAt", "dropout_at"]),
    pickNested(selection, ["dropoutAt", "dropout_at"]),
  );
  const billedReason = pickFirst(
    pickNested(source, ["billedReason", "billed_reason"]),
    pickNested(selection, ["billedReason", "billed_reason"]),
    status === "billed" ? genericReason : null,
  );
  const billedAt = pickFirst(
    pickNested(source, ["billedAt", "billed_at"]),
    pickNested(selection, ["billedAt", "billed_at"]),
  );
  const leftReason = pickFirst(
    pickNested(source, ["leftReason", "left_reason"]),
    pickNested(selection, ["leftReason", "left_reason"]),
    status === "left" ? genericReason : null,
  );
  const leftAt = pickFirst(
    pickNested(source, ["leftAt", "left_at"]),
    pickNested(selection, ["leftAt", "left_at"]),
  );
  const jobJid = pickFirst(
    pickNested(source, [
      "jobJid",
      "job_jid",
      "jid",
      "jobId",
      "job_id",
      "jobID",
      "job.jid",
      "job.jobJid",
      "job.job_id",
      "job.jobId",
    ]),
    nestedJob.jobJid,
    nestedJob.jid,
  );
  const companyName = pickFirst(
    pickNested(source, [
      "companyName",
      "company_name",
      "company",
      "companyTitle",
      "company_title",
      "employerName",
      "employer_name",
      "jobCompany",
      "job_company",
      "clientName",
      "client_name",
    ]),
    nestedJob.companyName,
    nestedJob.company_name,
  );
  const roleName = pickFirst(
    pickNested(source, [
      "roleName",
      "role_name",
      "jobTitle",
      "job_title",
      "jobRole",
      "job_role",
    ]),
    nestedJob.roleName,
    nestedJob.role_name,
  );
  const city = pickFirst(
    pickNested(source, [
      "officeLocationCity",
      "office_location_city",
      "city",
      "jobCity",
      "job_city",
      "location",
      "location_city",
      "locationCity",
      "jobLocation",
      "job_location",
      "currentCity",
      "current_city",
      "job.city",
      "job.jobCity",
      "job.job_city",
      "job.location",
    ]),
    nestedJob.city,
  );
  const officeLocationCity = pickFirst(
    pickNested(source, [
      "officeLocationCity",
      "office_location_city",
      "manualOfficeLocationCity",
      "manual_office_location_city",
    ]),
    pickNested(nestedJob, ["officeLocationCity", "office_location_city"]),
  );
  const normalizedJob = {
    ...nestedJob,
    jid: pickFirst(nestedJob.jid, jobJid),
    jobJid: pickFirst(nestedJob.jobJid, jobJid),
    companyName: pickFirst(nestedJob.companyName, companyName),
    company_name: pickFirst(nestedJob.company_name, companyName),
    roleName: pickFirst(nestedJob.roleName, roleName),
    role_name: pickFirst(nestedJob.role_name, roleName),
    city: pickFirst(nestedJob.city, city),
  };

  return {
    ...source,
    resId: pickFirst(source.resId, resId),
    rid: pickFirst(source.rid, rid),
    recruiterRid: pickFirst(source.recruiterRid, rid),
    recruiterName: pickFirst(source.recruiterName, recruiterName),
    recruiterEmail: pickFirst(source.recruiterEmail, recruiterEmail),
    candidateName: resolvedCandidateName,
    applicantName: resolvedApplicantName,
    name: resolvedName,
    candidateEmail: pickFirst(source.candidateEmail, candidateEmail),
    applicantEmail: pickFirst(source.applicantEmail, candidateEmail),
    email: pickFirst(source.email, candidateEmail),
    candidatePhone: pickFirst(source.candidatePhone, candidatePhone),
    applicantPhone: pickFirst(source.applicantPhone, candidatePhone),
    phone: pickFirst(source.phone, candidatePhone),
    mobile: pickFirst(source.mobile, candidatePhone),
    status: pickFirst(status, source.status),
    currentStatus: pickFirst(source.currentStatus, currentStatus, status),
    workflowStatus: pickFirst(source.workflowStatus, status),
    submittedReason: pickFirst(source.submittedReason, submittedReason),
    submittedAt: pickFirst(source.submittedAt, submittedAt),
    uploadedAt: pickFirst(source.uploadedAt, uploadedAt),
    workflowUpdatedAt: pickFirst(source.workflowUpdatedAt, workflowUpdatedAt),
    updatedAt: pickFirst(source.updatedAt, updatedAt),
    createdAt: pickFirst(source.createdAt, createdAt),
    verifiedReason: pickFirst(source.verifiedReason, verifiedReason),
    verifiedAt: pickFirst(source.verifiedAt, verifiedAt),
    othersReason: pickFirst(source.othersReason, othersReason),
    othersAt: pickFirst(source.othersAt, othersAt),
    walkInReason: pickFirst(source.walkInReason, walkInReason),
    walkInAt: pickFirst(source.walkInAt, walkInAt),
    selectReason: pickFirst(source.selectReason, selectReason),
    selectedAt: pickFirst(source.selectedAt, selectedAt),
    rejectReason: pickFirst(source.rejectReason, rejectReason),
    rejectedAt: pickFirst(source.rejectedAt, rejectedAt),
    shortlistedReason: pickFirst(source.shortlistedReason, shortlistedReason),
    shortlistedAt: pickFirst(source.shortlistedAt, shortlistedAt),
    pendingJoiningReason: pickFirst(
      source.pendingJoiningReason,
      shortlistedReason,
    ),
    walkInDate: pickFirst(source.walkInDate, walkInDate),
    joiningDate: pickFirst(source.joiningDate, joiningDate),
    joiningNote: pickFirst(source.joiningNote, joiningNote),
    joinedReason: pickFirst(source.joinedReason, joinedReason),
    joinedAt: pickFirst(source.joinedAt, joinedAt),
    dropoutReason: pickFirst(source.dropoutReason, dropoutReason),
    dropoutAt: pickFirst(source.dropoutAt, dropoutAt),
    billedReason: pickFirst(source.billedReason, billedReason),
    billedAt: pickFirst(source.billedAt, billedAt),
    leftReason: pickFirst(source.leftReason, leftReason),
    leftAt: pickFirst(source.leftAt, leftAt),
    jobJid: pickFirst(source.jobJid, jobJid),
    companyName: pickFirst(source.companyName, companyName),
    company_name: pickFirst(source.company_name, companyName),
    roleName: pickFirst(source.roleName, roleName),
    role_name: pickFirst(source.role_name, roleName),
    officeLocationCity: pickFirst(source.officeLocationCity, officeLocationCity),
    office_location_city: pickFirst(source.office_location_city, officeLocationCity),
    city: pickFirst(source.city, officeLocationCity, city),
    job: normalizedJob,
  };
};

export const formatResumeCompanyDisplay = (resume, fallbackJob = null) => {
  const normalized = normalizeResumeData(resume, fallbackJob);
  const companyName = pickFirst(
    normalized.companyName,
    normalized.company_name,
    normalized.job?.companyName,
    normalized.job?.company_name,
  );
  const officeLocationCity = pickFirst(
    normalized.officeLocationCity,
    normalized.office_location_city,
  );

  if (!companyName) return "N/A";
  if (!officeLocationCity) return companyName;

  return `${companyName}, ${officeLocationCity}`;
};

export const formatResumeCityDisplay = (resume, fallbackJob = null) => {
  const normalized = normalizeResumeData(resume, fallbackJob);
  return pickFirst(
    normalized.officeLocationCity,
    normalized.office_location_city,
    normalized.city,
    normalized.job?.city,
    normalized.job?.jobCity,
  ) || "N/A";
};

export const buildCandidatePayloadAliases = (resume, fallbackJob = null) => {
  const normalized = normalizeResumeData(resume, fallbackJob);
  const candidateName = pickFirst(
    normalized.candidateName,
    normalized.applicantName,
    normalized.name,
  );
  const candidateEmail = pickFirst(
    normalized.candidateEmail,
    normalized.applicantEmail,
    normalized.email,
  );
  const candidatePhone = pickFirst(
    normalized.candidatePhone,
    normalized.phone,
    normalized.mobile,
  );

  return {
    ...(candidateName
      ? {
          candidate_name: candidateName,
          candidateName,
          applicant_name: candidateName,
          applicantName: candidateName,
          name: candidateName,
        }
      : {}),
    ...(candidateEmail
      ? {
          candidate_email: candidateEmail,
          candidateEmail,
          applicant_email: candidateEmail,
          applicantEmail: candidateEmail,
          email: candidateEmail,
        }
      : {}),
    ...(candidatePhone
      ? {
          candidate_phone: candidatePhone,
          candidatePhone,
          phone: candidatePhone,
          phone_number: candidatePhone,
          phoneNumber: candidatePhone,
          mobile: candidatePhone,
          mobile_number: candidatePhone,
          mobileNumber: candidatePhone,
        }
      : {}),
  };
};
