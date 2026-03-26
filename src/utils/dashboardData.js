const isPresent = (value) =>
  value !== null && value !== undefined && String(value).trim() !== "";

const pickFirst = (...values) => values.find(isPresent);

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
  const jid = pickNested(source, ["jid", "jobJid", "job_id", "jobId", "id"]);
  const companyName = pickNested(source, [
    "companyName",
    "company_name",
    "company",
    "employerName",
    "employer_name",
    "organizationName",
    "organization_name",
  ]);
  const roleName = pickNested(source, [
    "roleName",
    "role_name",
    "title",
    "jobTitle",
    "job_title",
    "position",
    "designation",
  ]);
  const city = pickNested(source, [
    "city",
    "jobCity",
    "job_city",
    "location",
    "location_city",
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
  const nestedJob = normalizeJobData(
    pickFirst(source.job, source.jobDetails, source.job_data, fallbackJob) || {},
  );
  const nestedCandidate = pickFirst(
    source.candidate,
    source.applicant,
    source.candidateDetails,
    source.candidate_data,
    {},
  );

  const candidateName = pickFirst(
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
  const status = pickFirst(
    pickNested(source, ["workflowStatus", "workflow_status", "status"]),
    pickNested(source.selection || {}, ["status", "selection_status"]),
  );
  const jobJid = pickFirst(
    pickNested(source, ["jobJid", "job_jid", "jid", "jobId", "job_id"]),
    nestedJob.jobJid,
    nestedJob.jid,
  );
  const companyName = pickFirst(
    pickNested(source, [
      "companyName",
      "company_name",
      "company",
      "employerName",
      "employer_name",
    ]),
    nestedJob.companyName,
    nestedJob.company_name,
  );
  const roleName = pickFirst(
    pickNested(source, ["roleName", "role_name", "jobTitle", "job_title"]),
    nestedJob.roleName,
    nestedJob.role_name,
  );
  const city = pickFirst(
    pickNested(source, ["city", "jobCity", "job_city", "location"]),
    nestedJob.city,
  );

  return {
    ...source,
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
    phone: pickFirst(source.phone, candidatePhone),
    mobile: pickFirst(source.mobile, candidatePhone),
    status: pickFirst(source.status, status),
    workflowStatus: pickFirst(source.workflowStatus, status),
    jobJid: pickFirst(source.jobJid, jobJid),
    companyName: pickFirst(source.companyName, companyName),
    company_name: pickFirst(source.company_name, companyName),
    roleName: pickFirst(source.roleName, roleName),
    role_name: pickFirst(source.role_name, roleName),
    city: pickFirst(source.city, city),
    job: nestedJob,
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
