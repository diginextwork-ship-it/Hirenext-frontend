const isPresent = (value) =>
  value !== null && value !== undefined && String(value).trim() !== "";

const pickFirst = (...values) => values.find(isPresent);

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
    pickNested(selection, ["status", "selection_status"]),
    pickNested(source, ["status"]),
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
  const joinedReason = pickFirst(
    pickNested(source, ["joinedReason", "joined_reason"]),
    pickNested(selection, ["joinedReason", "joined_reason"]),
  );
  const dropoutReason = pickFirst(
    pickNested(source, ["dropoutReason", "dropout_reason", "reason"]),
    pickNested(selection, ["dropoutReason", "dropout_reason", "reason"]),
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
    candidateName: pickFirst(source.candidateName, candidateName),
    applicantName: pickFirst(source.applicantName, candidateName),
    name: pickFirst(source.name, candidateName),
    candidateEmail: pickFirst(source.candidateEmail, candidateEmail),
    applicantEmail: pickFirst(source.applicantEmail, candidateEmail),
    email: pickFirst(source.email, candidateEmail),
    candidatePhone: pickFirst(source.candidatePhone, candidatePhone),
    applicantPhone: pickFirst(source.applicantPhone, candidatePhone),
    phone: pickFirst(source.phone, candidatePhone),
    mobile: pickFirst(source.mobile, candidatePhone),
    status: pickFirst(status, source.status),
    workflowStatus: pickFirst(source.workflowStatus, status),
    walkInDate: pickFirst(source.walkInDate, walkInDate),
    joiningDate: pickFirst(source.joiningDate, joiningDate),
    joiningNote: pickFirst(source.joiningNote, joiningNote),
    joinedReason: pickFirst(source.joinedReason, joinedReason),
    dropoutReason: pickFirst(source.dropoutReason, dropoutReason),
    jobJid: pickFirst(source.jobJid, jobJid),
    companyName: pickFirst(source.companyName, companyName),
    company_name: pickFirst(source.company_name, companyName),
    roleName: pickFirst(source.roleName, roleName),
    role_name: pickFirst(source.role_name, roleName),
    city: pickFirst(source.city, city),
    job: normalizedJob,
  };
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
