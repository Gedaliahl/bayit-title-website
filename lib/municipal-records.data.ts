// The records themselves. Types, rules and helpers are in lib/municipal-records.ts.
//
// Every `text` is the city's own copy, verbatim, from the page at `sourceUrl`
// on `checkedOn`. Where two sentences from the same page are joined, the join
// is marked […]. Nothing is paraphrased into a claim.

import type { CityQuote, MunicipalRecord } from './municipal-records';

const READ = '2026-09-20';

const q = (text: string, sourceUrl: string, checkedOn: string = READ): CityQuote => ({
  text,
  sourceUrl,
  checkedOn,
});

export const MUNICIPAL_RECORDS: MunicipalRecord[] = [
  // ---------------------------------------------------------------- Orlando
  {
    citySlug: 'orlando',
    government: 'City of Orlando',
    building: {
      office: {
        name: 'Permitting Services Division',
        url: 'https://www.orlando.gov/Building-Development/Permits-Inspections/Renew-Extend-Close-or-Withdraw-a-Permit/Conduct-a-Title-Search',
      },
      portal: {
        name: 'the city’s permit lookup tool',
        url: 'https://www.orlando.gov/Building-Development/Permits-Inspections/Check-Permit-Status',
      },
      expiredPermits: q(
        'You need to renew the expired permit to avoid delays with future inspections, title searches and sale of the property. […] A permit technician will review your request and determine if your permit can be renewed or if it requires a replacement permit. We’ll contact you within three business days to let you know. […] You will need to pay a minimum permit fee or 25% of original permit fee, whichever is greater, up to $1,000 within six months of the permit expiration.',
        'https://www.orlando.gov/Building-Development/Permits-Inspections/Renew-Extend-Close-or-Withdraw-a-Permit/Renew-an-Expired-Permit',
      ),
    },
    codeEnforcement: {
      office: {
        name: 'Code Enforcement Division',
        url: 'https://www.orlando.gov/Our-Government/Departments-Offices/Economic-Development/Code-Enforcement',
      },
      hearingBody: q(
        'Code Enforcement Board Hears and decides alleged violations of codes and ordinances of the City.',
        'https://www.orlando.gov/Our-Government/Departments-Offices/Economic-Development/Code-Enforcement',
      ),
      liens: q(
        'The city works with the property owner to help them fix the violation. If the property owner doesn’t comply, we assess daily fees. If the violation isn’t corrected and the fees aren’t paid, we put a lien on their property.',
        'https://www.orlando.gov/Building-Development/Code-Enforcement/Report-a-Code-Violation',
      ),
      release: q(
        'For Code Enforcement Board (CEB) liens: If your case is still open, you will not be able to make a payment until it is closed. […] If a lien was placed on your property, a Satisfaction of Lien will be processed within 1-2 weeks from the date the payment clears. Checks must clear prior to processing lien removal.',
        'https://www.orlando.gov/Our-Government/Make-a-Payment/Pay-a-Code-Enforcement-Fine',
      ),
    },
    lienSearch: {
      office: {
        name: 'Permitting Services, for the status of a specific permit',
        url: 'https://www.orlando.gov/Building-Development/Permits-Inspections/Renew-Extend-Close-or-Withdraw-a-Permit/Conduct-a-Title-Search',
      },
      answeredBy: 'self-service',
      how: q(
        'Are you conducting a title search for a property and require additional information regarding an open/expired permit? Please check the permit lookup site for permit information. Permits consist of cases starting with: BLD, ELE, PLM, MEC, GAS, FIR, ENG, and ROW only. All other case types are not considered permits. […] If you have a specific request regarding the status of a permit, submit your request. Please allow 3-5 business days to receive a response.',
        'https://www.orlando.gov/Building-Development/Permits-Inspections/Renew-Extend-Close-or-Withdraw-a-Permit/Conduct-a-Title-Search',
      ),
      fee: null,
      turnaround: null,
    },
    utility: {
      provider: {
        name: 'the Orlando Utilities Commission, with the city’s sewer charge on its bill',
        url: 'https://www.orlando.gov/Our-Government/Departments-Offices/Public-Works/Water-Reclamation-Division/Understand-Your-Sewer-Bill',
      },
      statement: q(
        'Our Water Reclamation sewer billing section assesses and implements the water reclamation fee for residential and commercial properties served by the City’s Sewer system. These fees show up on your OUC Bill. […] Please check your bill to confirm you are a City of Orlando Wastewater customer. If you are an Orange County customer, please call 407.836.5515.',
        'https://www.orlando.gov/Our-Government/Departments-Offices/Public-Works/Water-Reclamation-Division/Understand-Your-Sewer-Bill',
      ),
    },
    other: [
      {
        label: 'Looking up a code case or lien yourself',
        quote: q(
          'Look Up Code Enforcement Cases and Liens Look up a code enforcement incident by incident number or address to see the latest status of a complaint.',
          'https://www.orlando.gov/Building-Development/Code-Enforcement',
        ),
      },
      {
        label: 'Asking the Board to reduce a penalty',
        quote: q(
          'The property must be in compliance with the Board’s order for the case. Prior to completing, you should verify that there is an affidavit of compliance completed by the officer handling the case and include it with your submittal. If any portion of the penalty or lien amount has been paid prior to the hearing on your request for reduction, you are barred from seeking a reduction of the amounts paid. […] The Board will consider requests for Reduction of Penalty ONLY ONCE FOR EACH CASE.',
          'https://www.orlando.gov/files/sharedassets/public/v/4/documents/code-enforcement/request-reduction-of-penalty-2026.pdf',
        ),
      },
      {
        label: 'Closing an open permit',
        quote: q(
          'Permits require an approved final inspection to be considered completed. Requests that have not received an approved final inspection will be reviewed to determine if the request can be fulfilled.',
          'https://www.orlando.gov/Building-Development/Permits-Inspections/Renew-Extend-Close-or-Withdraw-a-Permit/Request-to-Withdraw-or-Close-a-Permit',
        ),
      },
      {
        label: 'The stormwater fee rides the tax bill',
        quote: q(
          'Currently, the stormwater utility fee is imposed on each parcel of land within the City of Orlando. […] The stormwater utility fee is billed annually as a non-ad valorem charge on the Orange County property tax bill and is collected through the Orange County Tax Collector Office.',
          'https://www.orlando.gov/Our-Government/Departments-Offices/Public-Works/Streets-and-Stormwater-Division/Stormwater-Utility-Fee',
        ),
      },
      {
        label: 'Lot-cleaning charges can become liens',
        quote: q(
          'Property owners have 15 days to clean the property. If the owner does not clean the property, a city contractor will clean the property and invoice the property owner. Multiple violations in a 12 month period may result in additional fines and/or liens.',
          'https://www.orlando.gov/Our-Government/Departments-Offices/Economic-Development/Code-Enforcement/Citizens-Guide-to-City-of-Orlando-Codes',
        ),
      },
      {
        label: 'Home-sharing registration',
        quote: q(
          'The city’s home share ordinance took effect July 1, 2018 and has the following requirements: A rental period of less than 30 days. One booking at a time. The resident must live on site and be present when hosting guests.',
          'https://www.orlando.gov/Initiatives/Home-Sharing-Registration',
        ),
      },
    ],
    notes:
      'Orlando’s permit and code lookups are hosted for the city at myrelayview.com, which refused our automated requests; the links above are the city’s own pages that open them. Water is not billed by the city: the Orlando Utilities Commission bills it, with the city’s sewer charge on the same bill.',
  },

  // --------------------------------------------------------- St. Petersburg
  {
    citySlug: 'st-petersburg',
    government: 'City of St. Petersburg',
    building: {
      office: {
        name: 'Construction Services and Permitting Division',
        url: 'https://www.stpete.org/business/building_permitting/building_permits.php',
      },
      portal: { name: 'Click2Gov Building Permits', url: 'https://stpe-egov.aspgov.com/Click2GovBP/index.html' },
      expiredPermits: q(
        'I understand my inspections must be requested, completed, and approved, including a final inspection, within the time frame established by the Building Official. […] Application Fee for expired permit: $250.00 per permit for initial extension up to 90 days. $350 for extension of 2 or more permits for same parcel.',
        'https://www.stpete.org/Business/Building%20Forms%20&%20Applications/Permit_Extension_Request.pdf',
      ),
    },
    codeEnforcement: {
      office: {
        name: 'Codes Compliance Assistance Department',
        url: 'https://www.stpete.org/residents/community/codes_enforcement.php',
      },
      hearingBody: q(
        'There are three primary enforcement actions to encourage and achieve compliance: Civil Citation Process—For common issues involving homeowners and simple fines. Code Enforcement Board (CEB)—For larger issues involving hearings and liens. Municipal Ordinance Violation (MOV)—Formal judicial process involving the County Court. […] If the property owner fails to comply by the CEB’s previously ordered compliance date, a Special Magistrate hears the same case to consider lien certification.',
        'https://www.stpete.org/residents/community/codes_enforcement.php',
      ),
      liens: q(
        'The CEB evaluates evidence and testimony to determine whether violations exist, decides how much compliance time to allow, and also orders per diem fines which can result in liens against property for failure to comply with the ordered deadline. […] The Special Magistrate has the authority to defer lien certification so that the property owner can correct violations without penalty but also has the authority to certify liens against property for failure to correct violations.',
        'https://www.stpete.org/residents/community/codes_enforcement.php',
      ),
      release: q(
        'The CEB also hears lien release requests. To request a hearing for lien reduction or release, interested parties must submit a notarized application for consideration. The CEB will not grant reduction or release of liens on properties with active code violations.',
        'https://www.stpete.org/residents/community/codes_enforcement.php',
      ),
    },
    lienSearch: {
      office: { name: 'the Special Collections Division of Billing & Collections', url: 'https://www.stpete.org/pay/liens.php' },
      answeredBy: 'city',
      how: q(
        'A lien research request can be completed online and will include information on outstanding balances for active utility account charges, special assessments and utility liens. […] For Code Enforcement Board liens, contact Codes Compliance at 727-893-7373. For Nuisance Abatement liens, contact the Police Department at 727-892-5427.',
        'https://www.stpete.org/pay/liens.php',
      ),
      fee: q(
        'There is a $55.00 fee per request. Recording information or photocopies of recorded documents are not provided. […] The above fee will be charged even if the search reveals that the property is outside city limits.',
        'https://www.stpete.org/pay/liens.php',
      ),
      turnaround: q(
        'Results will be provided within 3 business days from receipt of request. Complete one Lien Research Request for each subject property/parcel identification number. A pay thru date must be provided on each search request. Once the pay thru date expires, a new lien research request must be submitted.',
        'https://www.stpete.org/pay/liens.php',
      ),
    },
    utility: {
      provider: { name: 'the city’s own Utility Billing', url: 'https://www.stpete.org/residents/utilities/utility_billing.php' },
      statement: q(
        'Residential utility services provided by the city include water, reclaimed water, trash and recycling collection, wastewater, and stormwater.',
        'https://www.stpete.org/residents/utilities/utility_billing.php',
      ),
    },
    other: [
      {
        label: 'What a lien release application costs',
        quote: q(
          'An application fee of $50 is required pursuant to City Code Section 12-11(9) for the initial application made by the property owner for the same property. Any second or subsequent requests require a $100 reapplication fee. […] The Code Enforcement Board and the Special Magistrate have the discretionary authority to reduce fines and liens; pursuant to Florida Statutes Chapter 162 as amended. An entity requesting a release of lien has no right to the reduction or release of a fine or lien. Applications will not be accepted if the Owner of Record has any active codes cases.',
          'https://www.stpete.org/Residents/codes/docs/Lien%20Release%20Application%202026-2027%20v2.pdf',
        ),
      },
      {
        label: 'A programme for a buyer of a property that carries code liens',
        quote: q(
          'New Owner Lien Release Program This program is for new owners that are considering or have recently purchased a property with code liens already attached. […] A new owner can enter into an agreement with the City of St. Petersburg whereby the new owner agrees to correct all code violations in return for the release of the requested liens associated with the property. […] Applicant will be responsible for providing: • $250.00 non-refundable fee, • Copies of the requested liens to be released, • Proof applicant has entered into a valid and enforceable contract for purchase of the property.',
          'https://www.stpete.org/Residents/codes/docs/CodeLienWaiverAgreement.pdf',
        ),
      },
      {
        label: 'Utility holds on a vacant property with open violations',
        quote: q(
          'When there are code violations at a property that is vacant, the city may place holds on the utility accounts to prevent utility theft and to prevent occupancy of the property until a thorough code inspection can be made.',
          'https://www.stpete.org/Residents/codes/docs/uraffidavit.pdf',
        ),
      },
      {
        label: 'Foreclosure registry',
        quote: q(
          'City ordinance 48-H (Sec. 8-146) requires the registration of properties subject to foreclosure action within 10 days of filing foreclosure action or within 10 days after the mortgagee has notified the borrower of default and the mortgagee finds evidence that the property is vacant. […] Registration costs $230 and are valid for one calendar year.',
          'https://www.stpete.org/residents/community/foreclosure_registry.php',
        ),
      },
      {
        label: 'Special assessment liens, and relief from their interest',
        quote: q(
          'Non-Capital Improvement Assessments are continuing assessments and are projects that may be repeated many times and are generally located at individual addresses. Project examples include lot clearings, demolitions, and securing property […] The intent of the program is to promote reinvestment and revitalization of property by providing a property owner, under certain terms and conditions, reasonable relief from burdensome accumulated interest on certain existing Special Assessment Liens.',
          'https://www.stpete.org/pay/liens.php',
        ),
      },
    ],
    notes:
      'The city’s $55 lien research request covers utility balances, special assessments and utility liens only. Code Enforcement Board liens are checked with Codes Compliance and nuisance-abatement liens with the Police Department, so a complete St. Petersburg search is three requests, not one. The city’s online request form itself refused our automated requests; the page above links to it.',
  },

  // ---------------------------------------------------------- Port St. Lucie
  {
    citySlug: 'port-st-lucie',
    government: 'City of Port St. Lucie',
    building: {
      office: {
        name: 'Building Department',
        url: 'https://www.cityofpsl.com/Government/Your-City-Government/Departments/Building',
      },
      portal: {
        name: 'Search Permits on a Property',
        url: 'https://pandapublicweb.cityofpsl.com/Bldg/PropertySearch.aspx',
      },
      expiredPermits: q(
        'If your permit expires and becomes null and void, you have two options: 1. Apply for a Demolition Permit: Remove all construction related to the expired permit from the site. 2. Start over with a new permit: Resubmit updated plans and documents that comply with current codes, ordinances, and regulations, and pay all applicable fees.',
        'https://www.cityofpsl.com/government/departments/building/permit-applications-checklists',
      ),
    },
    codeEnforcement: {
      office: {
        name: 'Code Compliance, in Neighborhood Services',
        url: 'https://www.cityofpsl.com/Government/Your-City-Government/Departments/Neighborhood-Services/Code-Compliance',
      },
      hearingBody: q(
        'Code violation cases in the City of Port St. Lucie are overseen by a Special Magistrate, who is an attorney and/or retired judge appointed by the City Council.',
        'https://www.cityofpsl.com/Government/Your-City-Government/Departments/Neighborhood-Services/Code-Compliance/Special-Magistrate',
      ),
      liens: q(
        'If violations persist after a case is heard by the Magistrate, daily fines may be imposed, potentially resulting in a city-imposed lien on the property’s title.',
        'https://www.cityofpsl.com/Government/Your-City-Government/Departments/Neighborhood-Services/Code-Compliance/Special-Magistrate',
      ),
      release: q(
        'Once all code violations are corrected, property owners may apply for a Modification or Partial Release of a Lien under certain conditions.',
        'https://www.cityofpsl.com/Government/Your-City-Government/Departments/Neighborhood-Services/Code-Compliance/Special-Magistrate',
      ),
    },
    lienSearch: {
      office: { name: 'Lien Services, in the Finance Department', url: 'https://forms.cityofpsl.com/LSD/' },
      answeredBy: 'city',
      how: q(
        'Submit a Request Allows the user to submit a request to the city where a lien search specialist will research all liens, open permits, active cases, and utility usage on behalf of the applicant. This request provides the most detail.',
        'https://forms.cityofpsl.com/LSD/',
      ),
      fee: q(
        'This service requires a $80 non-refundable payment per search (Standard Request / 3-5 business days turnaround). A "Rush Service" can also be requested for a $160 non-refundable fee (Results completed and returned between 1-2 business days).',
        'https://forms.cityofpsl.com/LSD/',
      ),
      turnaround: q(
        'Our records may not have all liens on the property, please check the St Lucie Clerks Office for all recorded liens - Our records may not reflect all liens or assessments on a particular property. A lien search will not show cross attaching liens that encumber a property by virtue of Chapter 162, Florida Statutes.',
        'https://forms.cityofpsl.com/LSD/',
      ),
    },
    utility: {
      provider: {
        name: 'the city’s Utility Systems Department',
        url: 'https://www.cityofpsl.com/Government/Your-City-Government/Departments/Utility-Systems/Connection-Support-Billing',
      },
      statement: q(
        'The Connection Support & Billing division is responsible for all customer inquiries and applications for water and/or sewer service, issues monthly bills, and processes payments.',
        'https://www.cityofpsl.com/Government/Your-City-Government/Departments/Utility-Systems/Connection-Support-Billing',
      ),
    },
    other: [
      {
        label: 'Every kind of lien the city’s Lien Services handles',
        quote: q(
          'Visit the Lien Management Portal to submit a lien search request, apply for modification, partial release, vacate, or check on previously submitted requests. […] Code Liens, Vacant Property Registration (VPR) Liens, Building Liens, Nuisance Abatement Liens, Unimproved Real Property Liens, Delinquent Utility Usage Liens, Utility Capital Charge Liens, Contractor’s License Liens, Community Services Liens, and Solid Waste Liens.',
          'https://www.cityofpsl.com/Government/Your-City-Government/Departments/Finance/Lien-Services',
        ),
      },
      {
        label: 'City charges that ride the tax bill',
        quote: q(
          'Solid waste residential service is billed annually on the non-ad valorem portion of the property tax bill',
          'https://www.cityofpsl.com/Government/Your-City-Government/Departments/Finance/Special-Assessment-Property-Tax',
        ),
      },
      {
        label: 'Abandoned property registration',
        quote: q(
          'Provide proof that a lis pendens, default and/or any action to foreclose upon a mortgage or similar instrument has been filed […] All applications and registration fees must be filed online',
          'https://www.cityofpsl.com/Government/Your-City-Government/Departments/Neighborhood-Services/Code-Compliance/Abandoned-Property-Registration',
        ),
      },
    ],
    notes:
      'Port St. Lucie’s main site refused our command-line requests and was read through a second fetcher on the same day; its lien-search portal at forms.cityofpsl.com was read directly. The same Finance office that answers the search takes the applications to modify, partially release or vacate a lien — Code Compliance does not.',
  },

  // --------------------------------------------------------------- Cape Coral
  {
    citySlug: 'cape-coral',
    government: 'City of Cape Coral',
    building: {
      office: {
        name: 'Permitting Services Division',
        url: 'https://www.capecoral.gov/departments/development_services/permitting_services_division/index.php',
      },
      portal: {
        name: 'the EnerGov Customer Self-Service Portal',
        url: 'https://energovweb.capecoral.gov/EnerGovProd/selfservice#/home',
      },
      expiredPermits: q(
        'Pursuant to Florida Building Code Section 105.4.1, permits expire if work has not commenced within 180 days of issuance or if work is suspended or abandoned for 180 days. Performing any work under an expired permit is a violation and may result in enforcement action under the enforcement procedures outlined in City of Cape Coral Ordinance 2-85. All work associated with expired permits must cease immediately until valid permits are reinstated. […] You are strongly urged to review your permit records immediately and take all necessary steps to renew, close, or otherwise address expired permits.',
        'https://www.capecoral.gov/Documents/Departments/Development%20Services/Notice%20to%20Industry/NOTICE%20TO%20INDUSTRY%20-EXPIRED%20PERMITS.pdf',
      ),
    },
    codeEnforcement: {
      office: {
        name: 'Code Compliance Division',
        url: 'https://www.capecoral.gov/departments/development_services/code_compliance_division/index.php',
      },
      hearingBody: q(
        'The City of Cape Coral conducts code enforcement hearings pursuant to Florida Statutes Title XI, Chapter 162. The City of Cape Coral uses a Special Magistrate to preside over the hearings as stipulated in Chapter 162.03(2)',
        'https://www.capecoral.gov/departments/development_services/code_compliance_division/code_compliance_hearings.php',
      ),
      liens: null,
      release: q(
        'The City Council adopted Resolution 9-09 to assist owners of properties that are being sold or have been purchased through foreclosure. The City Council adopted procedures and criteria to assist owners of properties for all other scenarios for the reduction of liens or fines under Ordinance 2-88.5. […] Please understand that each reduction of lien will require an extensive examination of the lien and case file and requires a minimum of two weeks to complete the lien reduction process. Please submit your application as soon as possible to expedite your lien reduction.',
        'https://www.capecoral.gov/departments/development_services/code_compliance_division/lien_reduction_program.php',
      ),
    },
    lienSearch: {
      office: {
        name: 'the Customer Billing Services payoff desk',
        url: 'https://www.capecoral.gov/departments/information_technology_services/geographic_information_system_gis/capeims.php',
      },
      answeredBy: 'city',
      how: q(
        'Payoff information will include special assessments (UEP), utility balances, open code cases and building permits, property restrictions and any special notes. […] Amounts are subject to change without notice and it is recommended that to ensure the best degree of accuracy, a payoff form be submitted in writing for a scheduled closing.',
        'https://www.capecoral.gov/departments/information_technology_services/geographic_information_system_gis/capeims.php',
      ),
      fee: q(
        'For more detailed payoff information, the City offers a free service where anyone can request payoff information for any parcel in the City of Cape Coral.',
        'https://www.capecoral.gov/departments/financial_services/customer_billing_services/assessments/index.php',
      ),
      turnaround: null,
    },
    utility: {
      provider: {
        name: 'the city’s Customer Billing Services',
        url: 'https://www.capecoral.gov/departments/financial_services/customer_billing_services/index.php',
      },
      statement: q(
        'Customer Billing Service (CBS) representatives are available to answer questions about bills and assist customers with problems pertaining to utility services (water, sewer, and irrigation), assessments, Contribution in Aid of Construction fees, lot mowing, stormwater, capital expansion fees, hardship, and grant assistance programs.',
        'https://www.capecoral.gov/departments/financial_services/customer_billing_services/index.php',
      ),
    },
    other: [
      {
        label: 'Releasing a utility, assessment or lot-mowing lien',
        quote: q(
          'Please note: A Copy of the Lien with the Name it was filed under and Dollar Amount must accompany the request. Releases will be done upon written request and after 30 days of receipt of payment. REQUEST FOR RELEASE OF LIEN Please Mark One: Utility Bill Capital Expansion Fees (Impacts) Assessments Contribution in Aid of Construction Lot Mowing Abatement Cases',
          'https://www.capecoral.gov/Documents/Departments/Financial%20Services/Customer%20Billing%20Services/Common%20Forms/Request%20for%20Release%20of%20Lien.pdf',
        ),
      },
      {
        label: 'City charges that ride the tax bill',
        quote: q(
          'Various assessments are processed through the Customer Billing Services Division. This includes the following areas: Stormwater, Lot Mowing, Fire Service, Solid Waste and Special Assessments. […] If a previously exempted property has a change in ownership, the city will send written notice to the new owner advising them that if they elect to continue the exemption and maintain their own lot, they must provide the city with written notice within 30 days.',
          'https://www.capecoral.gov/departments/financial_services/customer_billing_services/assessments/index.php',
        ),
      },
      {
        label: 'Rental registration, from 2026',
        quote: q(
          'Effective January 1, 2026, residential rental property registration is required on an annual basis, and owners must renew the registration for each registered property every year. […] Long‑Term Residential Rental Property: $35 annual registration fee per property (rented for a period greater than 6 months). Short‑Term Residential Rental Property: $350 annual registration fee per property (rented for a period of 6 months or less).',
          'https://www.capecoral.gov/departments/city_clerk/rental_property_registration.php',
        ),
      },
      {
        label: 'Registration of a vacant property in foreclosure',
        quote: q(
          'The Ordinance requires A MORTGAGEE to register and maintain any property upon which THE MORTGAGEE has initiated the foreclosure process upon and which is vacant, with the City Clerk’s Department.',
          'https://www.capecoral.gov/departments/city_clerk/registration_of_abandoned_real_property.php',
        ),
      },
    ],
    notes:
      'Cape Coral publishes no paid lien letter; the free payoff request from Customer Billing Services is the city’s answer, and it does not publish how long one takes. Code-lien reductions are a separate Code Compliance programme from the release of utility and assessment liens, which Customer Billing Services handles.',
  },
  // ------------------------------------------------------------ Jacksonville
  {
    citySlug: 'jacksonville',
    government: 'City of Jacksonville',
    building: {
      office: {
        name: 'Building Inspection Division',
        url: 'https://www.jacksonville.gov/departments/public-works/building-inspection-division',
      },
      portal: { name: 'the JaxEPICS Online Property Search', url: 'https://jaxepics.coj.net/Search/SearchResults' },
      expiredPermits: q(
        'Finalized – This status indicates that all work and required inspections have been performed. A permit with this status is closed. […] Expired – For permits issued since 1998, this status indicates work has commenced, but there has been a lack of progress or has been abandoned. These permits are considered open. Prior to 1998, this status was used for permits with no Certification of Occupancy. Staff would have to research to see if permits expired prior to 1998 are still open or not.',
        'https://www.jacksonville.gov/departments/public-works/building-inspection-division/online-permit-submission',
        '2026-09-22',
      ),
    },
    codeEnforcement: {
      office: {
        name: 'Municipal Code Compliance Division',
        url: 'https://www.jacksonville.gov/departments/neighborhoods/municipal-code-compliance',
      },
      hearingBody: q(
        'A Special Magistrate hears testimony from the Code Compliance Officer and property owner(s) to determine if the violations exist, set timelines for compliance, and may issue fines of up to $250.00 per day in cases where the property owner does not comply within the ordered timeframe.',
        'https://www.jacksonville.gov/departments/neighborhoods/municipal-code-compliance/who-we-are-and-what-we-do',
        '2026-09-22',
      ),
      liens: q(
        'Failure to correct violations of this section may result in removal of violations (abatement) by city contractor with related contracting and administrative costs (liens) placed on the property. In addition, violations may result in referral of the owner to the Special Magistrate for prosecution and possible subsequent fines, which ‘roll’ or continue until the owner complies all cited violations.',
        'https://www.jacksonville.gov/departments/neighborhoods/municipal-code-compliance/who-we-are-and-what-we-do',
        '2026-09-22',
      ),
      release: q(
        'There are two levels of potential lien reduction based on the owner’s level of investment: Tier 1: Interest Reduction Focus: Restored and approved compliance without capital improvements. Benefit: Reduction of accrued interest only. […] Tier 2: Principal and Interest Reduction Focus: Compliance combined with significant capital improvements. Eligibility: Aggregated liens must be $2,000 or greater. […] Only the property owner of record may apply. All ad valorem property taxes and special assessments, must be paid in full. A separate City policy governed by Jacksonville Ordinance Code Section 91.114 requires applicants to pay the nuisance and demolition lien first. The property must be in full compliance with the Jacksonville Ordinance Code. […] Applications may be submitted after construction is complete but before the property is sold.',
        'https://www.jacksonville.gov/departments/finance/accounting/liens',
        '2026-09-22',
      ),
    },
    lienSearch: {
      office: {
        name: 'the Building Inspection Division’s Online Property Search, with Code Compliance and JEA by phone',
        url: 'https://www.jacksonville.gov/departments/public-works/building-inspection-division/services',
      },
      answeredBy: 'self-service',
      how: q(
        'Building Inspection Division Online Property Search can be used to obtain and print the information about building code violations, COs and research permit details. […] You should also contact the officer of the day at the Regulatory Compliance Department, Municipal Code Compliance Division at 904-255-7000 to inquire about active Property Safety Issues and to inquire about abatement liens. A due-diligent check should also include our local utility company JEA 904-665-6000 to see if there are any utility holds in place.',
        'https://www.jacksonville.gov/departments/public-works/building-inspection-division/services',
        '2026-09-22',
      ),
      fee: null,
      turnaround: null,
    },
    utility: {
      provider: { name: 'JEA, the municipal utility, rather than a city department', url: 'https://www.jea.com/about/' },
      statement: q(
        'The Utility may require the payment of an outstanding balance or portion of an outstanding balance if the Customer or Beneficial User of the service resided at the property for which service is requested during the time the outstanding balance accrued and for the time the applicant resided there, not exceeding four years from the date of the debt',
        'https://www.jea.com/my_account/collections,_disconnections,_and_unauthorized_utility_use/',
        '2026-09-22',
      ),
    },
    other: [
      {
        label: 'Lien payoffs and releases come by public records request',
        quote: q(
          'Public record requests can include questions about active code compliance cases, case history, and questions associated with fines and liens, or administrative fine agreements. These items require a PRR: If you have already paid a nuisance or demolition lien and require a recorded lien release or satisfaction / Demolition liens or searches / Nuisance liens or searches / Administrative and magistrate hearing fines / Citation payoff amounts / Case details, case documents, and case status',
          'https://www.jacksonville.gov/departments/neighborhoods/municipal-code-compliance',
          '2026-09-22',
        ),
      },
      {
        label: 'The reduction programme covers abatement and demolition liens, not fine liens',
        quote: q(
          'Nuisance abatement and demolition liens differ from statutory liens resulting from the imposition of administrative fines in that nuisance abatement and demolition liens represent expenditures of taxpayer dollars whereas administrative fines do not. […] Nuisance / Demolition Lien Reduction Application can be submitted at any point after the date of property ownership and before the property is sold, but after construction completion.',
          'https://www.jacksonville.gov/getContentAsset/35813382-d42c-4908-bde0-b0bdd2286720/135b97c9-84fa-4e82-b956-0fbccec4aa1f/GC-1748218-v1-Nuisance_Abatement_and_Demolition_Lien_Reduction_Policy_05-08-26_final_ADA.pdf?language=en',
          '2026-09-22',
        ),
      },
      {
        label: 'Stormwater and solid-waste fees ride the tax bill and are prorated at closing',
        quote: q(
          'The City of Jacksonville charges user fees to certain property owners for residential solid waste collection and stormwater (drainage system) maintenance and management. These fees are billed as non-ad valorem assessments on property tax bills. […] Customers who sell/buy property will have their fees settled during closing, just like ad valorem taxes',
          'https://www.jacksonville.gov/departments/cityfees',
          '2026-09-22',
        ),
      },
      {
        label: 'Foreclosure property registry',
        quote: q(
          'In 2018 Ordinance 2018-104-E amended Chapter 179 of the Ordinance Code to require mortgagees to register all vacant properties, properties whose mortgages are in default, and foreclosed properties with the City of Jacksonville’s Neighborhoods Department and pay a fee of $250 for each registration with an annual renewal.',
          'https://www.jacksonville.gov/departments/neighborhoods/neighborhoods-property-administration/foreclosure-property-registry',
          '2026-09-22',
        ),
      },
    ],
    notes:
      'Jacksonville publishes no lien letter of its own. Its own instruction to a searcher is the JaxEPICS property search, a call to Code Compliance about abatement liens, a call to JEA about utility holds, and a public records request for lien searches and payoff amounts. The Finance Department’s reduction programme is for nuisance-abatement and demolition liens; the city publishes no route for reducing a Special Magistrate fine lien.',
  },

  // --------------------------------------------------------- Fort Lauderdale
  {
    citySlug: 'fort-lauderdale',
    government: 'City of Fort Lauderdale',
    building: {
      office: {
        name: 'Building Services',
        url: 'https://www.fortlauderdale.gov/Government/Departments/Development-Services/Permitting-Services',
      },
      portal: {
        name: 'LauderBuild',
        url: 'https://www.fortlauderdale.gov/Government/Departments/Development-Services/LauderBuild',
      },
      expiredPermits: q(
        'Can I renew my permit and is there a limit to the number of times a permit can be renewed? Yes, a permit can be renewed once, beyond that it is the decision of the Building Official. If a permit is renewed before it expires, you will be assessed a fee of 50 percent of the original permit fee. If the permit is renewed after it expires you will be assessed 100 percent of the original permit fee.',
        'https://www.fortlauderdale.gov/Government/Departments/Development-Services/Permitting-Services',
      ),
    },
    codeEnforcement: {
      office: {
        name: 'Community Enhancement and Compliance Division',
        url: 'https://www.fortlauderdale.gov/Government/Departments/Community-Services/Community-Enhancement-and-Compliance',
      },
      hearingBody: q(
        'The City of Fort Lauderdale’s code cases are heard by a Special Magistrate. The Special Magistrate is appointed by the City Commission and has the jurisdiction and authority to hear and rule over code compliance matters. The Special Magistrate is a licensed attorney and a member of the Florida Bar. The Special Magistrate has the authority to subpoena witnesses and records, order rulings on violations, assess fines and order liens to be placed upon property.',
        'https://www.fortlauderdale.gov/Government/Departments/Community-Services/Community-Enhancement-and-Compliance/Administrative-Services/Community-Enhancement-Compliance-Hearings',
      ),
      liens: q(
        'After the Special Magistrate has ruled over a case, failure to correct the open code violations may result in fines of up to $500 a day until such violations are brought into compliance. Failure to comply could result in a lien filed against the title of the property. If a violation is severe and poses a threat to the health and safety of the neighbors, the city will initiate public nuisance proceedings against the property and correct the nuisance at the expense of the property owner.',
        'https://www.fortlauderdale.gov/Government/Departments/Community-Services/Community-Enhancement-and-Compliance/Administrative-Services/Community-Enhancement-Compliance-Hearings',
      ),
      release: q(
        'The City of Fort Lauderdale’s Lien Amnesty FY 2027 program establishes standard administrative lien reductions for properties meeting all program requirements: a fifty percent (50%) reduction for eligible residential properties, and a twenty-five percent (25%) reduction for eligible non-residential properties. […] The liened property, and any other property within the City of Fort Lauderdale with the same owner, must be in full compliance (no fines owed or current violations, whether cited or not). […] A non-refundable fee of $175.00 must be paid at the time of submission […] Once the City receives and processes full payment of the reduced lien amount, along with all applicable costs and fees, the Code Enforcement lien will be released.',
        'https://www.fortlauderdale.gov/Government/Departments/Community-Services/Community-Enhancement-and-Compliance/Lien-Amnesty-Program',
      ),
    },
    lienSearch: {
      office: {
        name: 'Conduits, a Net Assets Corporation system the city’s Finance Department publishes through',
        url: 'https://www.fortlauderdale.gov/Government/Departments/Finance/Lien-Search',
      },
      answeredBy: 'vendor',
      how: q(
        'The City of Fort Lauderdale provides electronic access to the City’s interests against real property. Reports are provided through the Internet using a system called Conduits™, which is operated and supported by Net Assets Corporation. Conduits reports are typically requested and provided to title companies, search agencies, escrow agents, and other real estate professionals as a regular part of real estate transactions. […] For any questions regarding lien and expenditures payoff information, please refer to the Conduits report and use the messaging via Conduits to contact the city.',
        'https://www.fortlauderdale.gov/Government/Departments/Finance/Lien-Search',
      ),
      fee: null,
      turnaround: null,
    },
    utility: {
      provider: {
        name: 'the city’s Utility Billing and Collections',
        url: 'https://www.fortlauderdale.gov/Government/Departments/Finance/Utility-Billing-and-Collections',
      },
      statement: q(
        'Starting March 1, 2026, only property owners can establish new utility billing accounts in the City of Fort Lauderdale. Only accounts established after March 1, 2026, are impacted by this new ordinance; current tenant accounts remain unchanged unless service is disconnected. If service is disconnected, it can only be reestablished by the property owner. […] Account holders (new or reconnected) are required to provide a copy of settlement papers or lease, appropriate deposit, picture identification and Social Security Number or Federal ID Number, if applicable.',
        'https://www.fortlauderdale.gov/Government/Departments/Finance/Utility-Billing-and-Collections',
      ),
    },
    other: [
      {
        label: 'A partial release where liens cross-attach',
        quote: q(
          'Properties with cross attaching and/or foreclosed liens may be eligible for an administrative partial release of lien. The procedure for approval of an administrative partial release of lien ("APROL"), requires completion of an application and submission of date stamped photos taken within the past 30 days of the front, rear, and both sides of the property. […] If approved, the cost of an approved APROL is $500.00 per case. Note: If the property is not in full compliance, the request for the APROL may be rejected.',
          'https://www.fortlauderdale.gov/Government/Departments/Community-Services/Community-Enhancement-and-Compliance/Administrative-Services/Application-Programs',
        ),
      },
      {
        label: 'The city keeps every permit and plan on a property',
        quote: q(
          'The City keeps records of all permits and plans on any property, so that buyers and owners may be informed of a building’s full history. The Property Records Office maintains digital and microfilm records of building permits and plans for properties in Fort Lauderdale. […] Please allow up to 48 hours for response to all requests received by phone or email. […] Property records research, including from a digital source, shall be assessed a fee of twenty dollars ($20.00) per hour or five dollars ($5.00) per 15-minute increment thereof and does not include reproduction of records.',
          'https://www.fortlauderdale.gov/Government/Departments/Development-Services/Permitting-Services/Property-Records',
        ),
      },
      {
        label: 'Fire and stormwater assessments ride the tax bill',
        quote: q(
          'Beginning in October 2020, your stormwater rate will be billed annually on your property tax bill instead of monthly on your utility bill.',
          'https://www.fortlauderdale.gov/Government/Departments/Public-Works/Environmental-Operations/Stormwater-Operations/Stormwater-Assessment',
        ),
      },
      {
        label: 'Rental and vacant-property registration',
        quote: q(
          'The City of Fort Lauderdale has enacted an ordinance that requires property owners to register their rental properties with the City’s Code Compliance division by providing a phone number and email address where they may be reached. […] The Mortgagee of an abandoned residential real property, holding a mortgage that is in default, must register the property. […] There is an annual registration fee of two hundred dollars ($200) per property.',
          'https://www.fortlauderdale.gov/Government/Departments/Community-Services/Community-Enhancement-and-Compliance/Administrative-Services/Application-Programs',
        ),
      },
      {
        label: 'Buildings of 25 years and older',
        quote: q(
          'The Broward County Board of Rules and Appeals (BORA) has established a Building Safety Inspection Program for buildings and structures that are 25 years of age or older. […] Buildings must be inspected every 10 years. The first inspection is required when the building reaches 25 years of age, and subsequent inspections are due every ten years after that.',
          'https://www.fortlauderdale.gov/Government/Departments/Development-Services/Permitting-Services/Building-Safety-Inspection-Program',
        ),
      },
    ],
    notes:
      'Fort Lauderdale’s lien search is not answered at a city desk: the Finance Department publishes the city’s interests through Conduits, a Net Assets Corporation system built for title companies, and publishes no fee or turnaround of its own. Since 1 March 2026 only the property owner can open a new water account, with the settlement statement or deed in hand.',
  },

  // ------------------------------------------------------------- Gainesville
  {
    citySlug: 'gainesville',
    government: 'City of Gainesville',
    building: {
      office: {
        name: 'Building Division, in Sustainable Development',
        url: 'https://www.gainesvillefl.gov/Government-Pages/Government/Departments/Sustainable-Development/Building-Division/Building-Common-Questions',
      },
      portal: {
        name: 'PermitGNV',
        url: 'https://www.gainesvillefl.gov/Home/Do-It-Online/Online-Services-Permits-Payments/Online-Services-Permits-Payments',
      },
      expiredPermits: q(
        'If work has not started or an inspection has not been requested within 180 days from the issuance date of the permit, then the building permit will expire and need to be reinstated by the applicant. A reinstatement fee may occur. […] If work is being completed without a building permit, Code Enforcement may issue a Stop Work Order. This could result in the applicant/owner paying double the permit fees.',
        'https://www.gainesvillefl.gov/Government-Pages/Government/Departments/Sustainable-Development/Building-Division/Building-Common-Questions',
        '2026-09-22',
      ),
    },
    codeEnforcement: {
      office: {
        name: 'Code Enforcement, in Sustainable Development',
        url: 'https://www.gainesvillefl.gov/Government-Pages/Government/Departments/Sustainable-Development/Code-Enforcement',
      },
      hearingBody: q(
        'Violations are handled via Notice of Violation or Civil Citation. Notice of Violations cases are heard by the Special Magistrate, Civil Citations are heard in County Court.',
        'https://www.gainesvillefl.gov/Government-Pages/Government/Departments/Sustainable-Development/Code-Enforcement',
        '2026-09-22',
      ),
      liens: q(
        'If a guilty verdict is rendered, administrative costs are assessed, additional time is given to achieve compliance, and a daily fine is assessed if compliance is not achieved after the additional time has elapsed. The fines will run until compliance is achieved and the administrative costs are paid. […] Any accumulated fines and assessed costs will be attached to the property as a lien.',
        'https://www.gainesvillefl.gov/Government-Pages/Government/Departments/Sustainable-Development/Code-Enforcement',
        '2026-09-22',
      ),
      release: q(
        'The Gainesville Special Magistrate has jurisdiction to hear violations of the city code of ordinances and reduction and rescission requests of codes, fines and liens. To contact a Code Enforcement Officer concerning a specific case, call 352-334-5030.',
        'https://www.gainesvillefl.gov/Government-Pages/Government/Departments/Sustainable-Development/Code-Enforcement/Special-Magistrate',
        '2026-09-22',
      ),
    },
    lienSearch: {
      office: {
        name: 'PermitGNV, for a property’s permit history',
        url: 'https://www.gainesvillefl.gov/Government-Pages/Government/Departments/Sustainable-Development/Building-Division/Building-Common-Questions',
      },
      answeredBy: 'self-service',
      how: q(
        'How do I search to see what permits were pulled on a particular property? You can search for any property in the City of Gainesville limits using our online portal, PermitGNV. Click on the Search tab and enter the property information (as it is shown in Property Appraiser) and once you click submit, it will show you all the permits under the property. […] We also have a Property Search report which is located under the Reports tab, that allows you to generate an excel sheet of all the permits under a parcel or address.',
        'https://www.gainesvillefl.gov/Government-Pages/Government/Departments/Sustainable-Development/Building-Division/Building-Common-Questions',
        '2026-09-22',
      ),
      fee: null,
      turnaround: null,
    },
    utility: {
      provider: { name: 'Gainesville Regional Utilities, owned by the city', url: 'https://www.gru.com/About-GRU' },
      statement: q(
        'Gainesville Regional Utilities, known as GRU, is a multi-service utility owned by the City of Gainesville. […] We serve approximately 100,000 retail and wholesale customers in Gainesville and surrounding areas, offering: Electric Natural gas Water Wastewater Telecommunications services',
        'https://www.gru.com/About-GRU',
        '2026-09-22',
      ),
    },
    other: [
      {
        label: 'The city’s fine limits are the higher ones the statute lets a large city adopt',
        quote: q(
          'If the correction is not made, then the individual may be subject to fines of up to $1000.00 per day per violation for a first time offense and up to $5000.00 per day per violation for a repeat offense, and the city shall be entitled to recover all costs incurred in prosecuting the case before the board. If the board finds the violation to be irreparable or irreversible in nature, it may impose a fine up to $15,000.00 per violation.',
          'https://www.gainesvillefl.gov/Government-Pages/Government/Departments/Sustainable-Development/Code-Enforcement/Code-Violation-FAQs',
          '2026-09-22',
        ),
      },
      {
        label: 'Asking the Special Magistrate to reduce or rescind a fine',
        quote: q(
          '(property owner/interested party) hereby request to be placed on the Agenda for a request for reduction or rescission of the fine and costs against property that I own or have interest in. […] I understand that the property is in compliance as of',
          'https://www.gainesvillefl.gov/Government-Pages/Government/Departments/Sustainable-Development/Code-Enforcement/Code-Enforcement-Forms-and-Documents',
        ),
      },
      {
        label: 'Solid waste and stormwater move to the tax bill in October 2026, and are prorated at closing',
        quote: q(
          'Since the 1980s, Solid Waste and Stormwater Management Utility (SMU) fees have been included on GRU bills. Starting this October, the city is transferring billing to non-ad valorem special assessments, and the special assessments will be billed annually on property tax bills and collected by the Alachua County Tax Collector.',
          'https://www.gainesvillefl.gov/Government-Pages/Government/Departments/Financial-Services/Special-Assessments',
          '2026-09-22',
        ),
      },
      {
        label: 'What happens to an assessment already paid when the property sells',
        quote: q(
          'If you sell your property after you have paid the assessments for the year, you will receive a prorated credit back from the buyer. This will be handled by the closing agent when the sale is closed.',
          'https://www.gainesvillefl.gov/Government-Pages/Government/Departments/Public-Works/Stormwater-Special-Assessment',
          '2026-09-22',
        ),
      },
      {
        label: 'Fire assessment',
        quote: q(
          'It is imposed annually covering Oct. 1 to Sept. 30 of each fiscal year. It is payable as part of annual property tax bills, between Nov. 1 and March 31.',
          'https://www.gainesvillefl.gov/Government-Pages/Government/Departments/Gainesville-Fire-Rescue-GFR/Fire-Assessment',
          '2026-09-22',
        ),
      },
      {
        label: 'Rental rules',
        quote: q(
          'On September 17, 2020 the Gainesville City Commission adopted the Rental Housing Ordinance which established annual permits, inspections, minimum energy efficiency, life safety and property maintenance standards for all residential rental units within the city. This ordinance is currently being repealed and there are no specific regulations for rentals in the City of Gainesville.',
          'https://www.gainesvillefl.gov/Government-Pages/Government/Departments/Sustainable-Development/Rental-Housing-Ordinance',
          '2026-09-22',
        ),
      },
    ],
    notes:
      'Gainesville publishes no lien-search or estoppel service; permit history is self-service in PermitGNV, code cases go through the Special Magistrate, and utility balances are GRU’s. The reduction form itself refused an automated request on 22 September; its words were read from the copy saved two days earlier, and the Forms and Documents page that carries it was read live.',
  },
  // ----------------------------------------------------------------- Hialeah
  {
    citySlug: 'hialeah',
    government: 'City of Hialeah',
    building: {
      office: { name: 'Building Department', url: 'https://www.hialeahfl.gov/154/Building-Department' },
      portal: {
        name: 'the Tyler Customer Self Service portal',
        url: 'https://hialeahfl-energovpub.tylerhost.net/apps/selfservice#/home',
      },
      expiredPermits: q(
        'CLOSE OUT INSPECTION BD805 Inspections for the purpose of violations, work without permits, open permits, expired permits, close out inspections, etc. (per inspection) … $75.00 […] In circumstances were permits have become expired but are lacking final inspections or unusual circumstances are given the Building Official has the authority to charge the necessary fees to cover for expenses incurred to bring into compliance. […] Where a permit has expired pursuant to paragraph 104.5 Florida Building Code, a credit of fifty percent (50%) of the permit fee shall be applied to any re-application (Renewal) fee for a permit covering the same project and involving the same plans, provided that the complete re-application is made within six (6) months of the expiration date of the original permit',
        'https://www.hialeahfl.gov/DocumentCenter/View/21520/Building-Department-Fee-Schedule-Effective-March-20-2026pdf',
        '2026-09-22',
      ),
    },
    codeEnforcement: {
      office: { name: 'Code Compliance Division', url: 'https://www.hialeahfl.gov/152/Code-Compliance' },
      hearingBody: q(
        'The Special Magistrate is vested with the statutory authority outlined in Chapter 162 of the Florida Statutes to hear code enforcement cases. […] The Special Magistrate is authorized to hold hearings and impose fines, liens, and other non-criminal penalties against violators. Administrative hearings are held at least once a month.',
        'https://www.hialeahfl.gov/672/Special-Magistrate',
        '2026-09-22',
      ),
      liens: q(
        'When fines, fees or charges remain unpaid by property owners, the City of Hialeah can exercise its legal right to place a lien against an owner’s property to ensure the eventual collection of an unpaid amount.',
        'https://www.hialeahfl.gov/780/Lien-Search',
        '2026-09-22',
      ),
      release: q(
        'The undersigned, as the owner of the property, license holder, or agent duly authorized, hereby requests a hearing before the Special Master of the City of Hialeah to consider a reduction of civil penalties accrued pursuant to that certain Order, more particularly described below: (Attach a copy of the recorded Order to this form) […] I understand that this reduction is strictly discretionary by the Special Master. This application includes a waiver of the right, if any, to seek judicial review of the Special Master’s discretionary decision of whether or not to reduce the fine and if so, by how much.',
        'https://www.hialeahfl.gov/DocumentCenter/View/14473/Request-for-Administrative-Hearing-Lien-Reduction-Request-and-Waiverpdf',
        '2026-09-22',
      ),
    },
    lienSearch: {
      office: { name: 'the Office of the City Clerk', url: 'https://www.hialeahfl.gov/780/Lien-Search' },
      answeredBy: 'city',
      how: q(
        'The City of Hialeah, through the Office of the City Clerk, shall offer research services of real property within the limits of the City that is limited to violations of several regulatory codes enforced by the City, including unsafe structures and open or expired building permits, unpaid water, sewer or solid waste services and liens recorded as a result of the City’s enforcement actions.',
        'https://www.hialeahfl.gov/780/Lien-Search',
        '2026-09-22',
      ),
      fee: q(
        'FEES: The cost of the service of violations and lien research is $500.00 The cost for the service of research of each additional address assigned to the same property folio number is $50.00. The cost for a pay-off or estoppel letter for all liens per property address is $75.00. The cost of an expedited lien search request is $600.00',
        'https://www.hialeahfl.gov/780/Lien-Search',
        '2026-09-22',
      ),
      turnaround: q(
        'The processing time for a standard violations and lien research is approximately 7-10 business days. The City offers an expedited violations and lien research service with a processing time of 2 business days, for an additional $100.00 (total of $600.00). The City will not issue a refund or credit once payment is made to the City. […] In order to obtain a pay-off amount once a violation and lien search is completed, a request for lien pay-off or estoppel letter must be submitted.',
        'https://www.hialeahfl.gov/DocumentCenter/View/21691/Violation-and-Lien-Search-Request-Form--2026',
        '2026-09-22',
      ),
    },
    utility: {
      provider: {
        name: 'the city’s Department of Public Works, Water & Sewer Division',
        url: 'https://www.hialeahfl.gov/1040/Water-Sewer',
      },
      statement: q(
        'The Department provides water and wastewater services throughout the city, as well as water service to portions of unincorporated Miami-Dade County. […] To maintain a reliable water supply, the City purchases most of its drinking water from Miami-Dade County.',
        'https://www.hialeahfl.gov/1040/Water-Sewer',
        '2026-09-22',
      ),
    },
    other: [
      {
        label: 'A Certificate of Re-Occupancy is required at a residential closing',
        quote: q(
          'A Certificate of Re-Occupancy is required for all applicable real estate closings and other transactions on residential units within the City of Hialeah. The purpose of the inspection is to ensure that the property complies with current zoning regulations. The Certificate of Re-Occupancy does not constitute any representation or warranty regarding the condition of the dwelling or other structures on the premises for which the certificate is issued. […] The inspection conducted in connection with a Certificate of Re-Occupancy is neither a structural, electrical, plumbing, nor mechanical inspection and does not indicate that the premises conform to the provisions of the Code, including the building and technical codes adopted by the city.',
          'https://www.hialeahfl.gov/657/Re-Occupancy-Inspections',
          '2026-09-22',
        ),
      },
      {
        label: 'What the pay-off letter does and does not cover',
        quote: q(
          'Payoff amounts are only provided for existing liens, based on the information provided on this form. The letter will NOT include information about violations, citations, open permits, or outstanding balances for water, sewer, or solid waste services. A pay-off letter is not "research" and will not include all the information provided in a "Violation and Lien Research Request". If no lien exists, a $0 pay-off letter will be provided. […] There is a non-refundable $75 fee per folio number. Pay-off calculations may take approximately 5 business days to complete.',
          'https://www.hialeahfl.gov/DocumentCenter/View/21692/Lien-Pay-Off-Request-Form---2026',
          '2026-09-22',
        ),
      },
      {
        label: 'A water balance for a title company',
        quote: q(
          'Title Company Request For verbal confirmation of an account balance: Contact Liens at 305-556-3800, ext. 2574 […] For written confirmation of an account balance: The Department of Public Works will be able to assist you by submitting a public records request on your behalf to the City Clerk’s Office. The City Clerk then contacts the Title Company directly once the request has been processed',
          'https://www.hialeahfl.gov/1045/Account-Balance',
          '2026-09-22',
        ),
      },
      {
        label: 'Mitigation of liens is a standing agenda item',
        quote: q(
          'Special Magistrate Hearings are held at least once a month at City Hall, in the Council Chambers on the third floor. […] The agenda is typically divided into sections such as Appeals, Referred Cases, and Mitigation of Liens/Fees.',
          'https://www.hialeahfl.gov/929/Special-Master-Hearings',
          '2026-09-22',
        ),
      },
      {
        label: 'Unpermitted work, before the city finds it',
        quote: q(
          'The Building Relief Program encourages voluntary compliance with the Florida Building Code and other applicable construction standards. It helps eligible participants by reducing penalties and fines if they take corrective action for unpermitted work before the City initiates enforcement. […] Am I eligible if my property has been cited for building without a permit or illegal unit? No. If the City has already begun enforcement, such as issuing a Notice of Civil Violation, the applicant is not eligible to participate.',
          'https://www.hialeahfl.gov/685/Amnesty-Program',
          '2026-09-22',
        ),
      },
      {
        label: 'Foreclosure registry',
        quote: q(
          'Effective July 1, 2013, the City of Hialeah requires the registration of certain real properties that are in default, foreclosure, or are mortgagee (bank) owned as a result of foreclosure, deed-in-lieu of foreclosure, or surrender to a mortgagee pursuant to a bankruptcy proceeding. […] The City has partnered with Hera Property Registry, LLC to administer its Foreclosure and Vacant Property Registration Program.',
          'https://www.hialeahfl.gov/230/Foreclosure-Registry-Program',
          '2026-09-22',
        ),
      },
    ],
    notes:
      'Hialeah is the one city on these pages that requires a certificate on a residential sale: the zoning-only Certificate of Re-Occupancy, applied for in the same portal as a permit. Its lien research is also the dearest and slowest here, and the pay-off letter is a second request made after the research comes back. An older form on the Compliance Forms page still shows a lower research fee; the City Clerk’s 2026 form and the Lien Search page both say $500.',
  },

  // ----------------------------------------------------------------- Miramar
  {
    citySlug: 'miramar',
    government: 'City of Miramar',
    building: {
      office: {
        name: 'Building Division, in Building, Planning & Zoning',
        url: 'https://www.miramarfl.gov/Departments/Building-Planning-Zoning/Building-Permits-Inspections',
      },
      portal: { name: 'the Self-Service Portal', url: 'https://miramarfl-energovweb.tylerhost.net/apps/SelfService#/home' },
      expiredPermits: q(
        'Every permit issued shall become null and void if work, as defined in Section 105.3.2.6 authorized by such permit is not commenced within one hundred eighty (180) days from the date the permit is issued or if the work authorized by such permit is suspended or abandoned for a period of ninety (90) days after the time the work is commenced. The Building Official may approve the renew, re-issuance or extend the permit after a written request from permit holder.',
        'https://www.miramarfl.gov/files/assets/public/v/2/buildingplanningzoning/documents/application-and-forms/request-for-permit-renewal-extension.pdf',
        '2026-09-22',
      ),
    },
    codeEnforcement: {
      office: { name: 'Code Compliance Division', url: 'https://www.miramarfl.gov/Departments/Police/About-Us/Code-Compliance' },
      hearingBody: q(
        'The city of Miramar currently has two compliance processes in place. […] Special Magistrate Process: The code officer identifies the violation based on the city’s ordinance. An official notice of violation is issued. Compliance renders the case closed OR Non-compliance at this stage results in a hearing. A hearing is scheduled. Fine(s) and/or lien(s) are assessed against the property. […] Administrative Hearing Process: The code officer identifies the violation An official civil violation notice is issued Compliance renders the case closed OR Non-compliance at this stage results in daily fines for up to 20 days The alleged violator must request a hearing to dispute the fines Lien(s) are assessed against the property',
        'https://www.miramarfl.gov/Departments/Police/About-Us/Code-Compliance/Special-Magistrate-and-Administrative-Hearing-Judicial-Processes',
        '2026-09-22',
      ),
      liens: q(
        'The special magistrate listens to testimony and evidence, and determines if a property is in violation. A property owner found in violation is given a specific period of time to correct the violation. Fines can accrue daily and liens can be filed against the property as well.',
        'https://www.miramarfl.gov/Departments/Police/About-Us/Code-Compliance/Code-Compliance-Commonly-Asked-Questions',
        '2026-09-22',
      ),
      release: q(
        'I just found out there is a code compliance lien against my property. How do I get the lien released? Once the property is in compliance, the fines can be reduced and the lien, if applicable, released. Compliance is the key. Call 954-602-3174 for more information.',
        'https://www.miramarfl.gov/Departments/Police/About-Us/Code-Compliance/Code-Compliance-Commonly-Asked-Questions',
        '2026-09-22',
      ),
    },
    lienSearch: {
      office: {
        name: 'Financial Services, Lien Inquiry Processing',
        url: 'https://www.miramarfl.gov/Departments/Financial-Services/Lien-Search',
      },
      answeredBy: 'city',
      how: q(
        'To obtain a lien search from the City of Miramar, please complete the Lien Request Form […] The City checks for the following liens: • Property Liens • Delinquent Account Balances • Water and Sewer Account Balances • Special Assessments […] Your lien request is incomplete without contacting the Building Department Permit for open building permit and Code Compliance Division for open code violations.',
        'https://www.miramarfl.gov/Departments/Financial-Services/Lien-Search',
        '2026-09-22',
      ),
      fee: q(
        'Lien Inquiry Fee $105.00 Per Address (please allow 3-5 business days) […] For balance update, please email wbcustomerservice@miramarfl.gov (available within 60 days of request at no additional charge). […] Updates are considered a new request, and the requestor must pay the lien inquiry fees.',
        'https://www.miramarfl.gov/Departments/Financial-Services/Lien-Search',
        '2026-09-22',
      ),
      turnaround: q(
        'Lien Inquiry Fee of $105.00 per address/folio # (please allow 3-5 business days). Lien response good for 30 days after date at the bottom of the form, with the exception of the Utility Billing balances.',
        'https://www.miramarfl.gov/files/assets/public/v/2/financeprocurement/documents/business-tax-receipts/lien-inquiryfinal-03-06-2023.pdf',
      ),
    },
    utility: {
      provider: {
        name: 'the city’s Utility (Water) Billing division',
        url: 'https://www.miramarfl.gov/Departments/Financial-Services/Water-Billing-Division',
      },
      statement: q(
        'An account can be closed only when a property is sold or rented. […] An account for a foreclosed property will be closed once the Certificate of Title is received. […] Effective October 1, 2024 a termination fee of $30 is applied to all accounts closed.',
        'https://www.miramarfl.gov/Departments/Financial-Services/Water-Billing-Division/Closing-Your-Account',
        '2026-09-22',
      ),
    },
    other: [
      {
        label: 'The separate permit lien search from the Building Division',
        quote: q(
          'RECORD SEARCH ONLY NO FIELD INSPECTIONS […] Please allow 5-7 Working days to process each property address for regular requests. […] Lien Search Requests are a point in time search and reflect the standing of the property at the time the search was completed. […] REGULAR REQUESTS $162.00 PER ADDRESS* EXPEDITED REQUESTS $270.00 PER ADDRESS* *PRICES INCLUDE CITY SURCHARGE',
          'https://www.miramarfl.gov/files/assets/public/v/5/buildingplanningzoning/documents/application-and-forms/fy-2026-building-lien-search-form-2-9-26-fillable.pdf',
        ),
      },
      {
        label: 'A code case is not searchable by the public',
        quote: q(
          'Can I check the status of my Code Compliance Case online? Due to privacy and legal matters, this service is only available to those who are listed as a contact on the Code Case.',
          'https://www.miramarfl.gov/Departments/Building-Planning-Zoning/Building-Permits-Inspections',
        ),
      },
      {
        label: 'Old plans may not exist',
        quote: q(
          'The City of Miramar is not likely to have records (blue prints, etc.) to satisfy public records requests for residents who live in structures built more than 10 years ago.',
          'https://www.miramarfl.gov/Departments/Building-Planning-Zoning/Building-Permits-Inspections',
        ),
      },
      {
        label: 'Fire protection assessment',
        quote: q(
          'Effective 2004, all residential units in Miramar were assessed a Fire Protection Assessment for a fee.',
          'https://www.miramarfl.gov/Departments/Fire-Rescue/Resources/Hardship-Exempt-Application',
        ),
      },
    ],
    notes:
      'A complete Miramar search is three requests: the Finance lien inquiry, the Building Division’s permit lien search and a call to Code Compliance, and the Finance page itself says a request is incomplete without the other two. The city’s PDF forms refused our command-line requests on 22 September; the two quoted were read from copies saved two days earlier and one through a second fetcher the same day.',
  },
  // ------------------------------------------------------------------- Miami
  {
    citySlug: 'miami',
    government: 'City of Miami',
    building: {
      office: { name: 'Building Department', url: 'https://www.miami.gov/My-Government/Departments/Building' },
      portal: {
        name: 'iBuild',
        url: 'https://www.miami.gov/Permits-Construction/Permitting-Resources/View-Permit-HistoryPermit-Search',
      },
      expiredPermits: q(
        'A Permit Extension can only be requested for active permits, and a Permit Completion must be requested if your permit has expired. […] A Permit Completion must be requested if your permit is expired, and the process is different based on the cost of the work to be performed. Once approved, this process will make your permit active again and grant 180 days from the time of request to complete all required work and finalize all required inspections. […] If the cost of the work to be performed is $10,000 or less, you can process your request via iBuild. If the cost of the work to be performed exceeds $10,001, your request must be reviewed and approved by the Chief for that specific trade, and your submission must be submitted via email.',
        'https://www.miami.gov/Permits-Construction/Request-a-Permit-Extension-or-Completion',
        '2026-09-22',
      ),
    },
    codeEnforcement: {
      office: { name: 'Department of Code Compliance', url: 'https://www.miami.gov/My-Government/Departments/Code-Compliance' },
      hearingBody: q(
        'Purpose: To issue orders having the force of law commanding whatever steps are necessary to bring a Code violation into compliance. […] The city commission may appoint one or more seven-member code enforcement boards.',
        'https://www.miami.gov/My-Government/Boards-Committees/Code-Enforcement-Board',
        '2026-09-22',
      ),
      liens: q(
        'Liens are placed on violating properties that have been determined to be guilty by the Code Enforcement Board and have not come into compliance by the ordered due date. Liens are removed once the property has come into compliance, all outstanding fines have been paid, and you have made this request and received approval. […] IMPORTANT NOTE: A lien cannot be released if the violation(s) is open and/or there are unpaid fees.',
        'https://www.miami.gov/My-Home-Neighborhood/Solve-a-Problem/Release-of-Lien-Request-RLN-for-Cityview-Citations-Only',
        '2026-09-22',
      ),
      release: q(
        'Do you have an open Code Enforcement case where you have corrected the violation, but there is an active per-diem-fine that is accruing? The City of Miami understands that you would like an opportunity to discuss your fines with either the Code Enforcement Board or the City Commission. […] Only the owner(s) or someone with legal standing (i.e. Legal Counsel, Power of Attorney) on behalf of the owner(s) can request this type of hearing. […] You must have an "Affidavit of Compliance" to request a Mitigation Hearing. All violations must be "complied". […] If your documents are correct, you will receive a notification of your hearing date, time, and location via email within 3-5 business days. At the hearing, the Board will make a Motion regarding the fines on your violation.',
        'https://www.miami.gov/Permits-Construction/Appeals-Hearings/Request-a-Hearing-in-Code-Enforcement/Request-a-Mitigation-Hearing-for-a-Code-Enforcement-Case',
        '2026-09-22',
      ),
    },
    lienSearch: {
      office: {
        name: 'the city’s own lien search, run inside iBuild',
        url: 'https://www.miami.gov/Permits-Construction/Property-Information/Run-a-Lien-or-Violation-Search',
      },
      answeredBy: 'city',
      how: q(
        'Are you purchasing a property and want to see if any liens or violations exist on it? The City of Miami makes this information public and easy to access through a lien search. […] NOTE: If the folio number does not begin with "01", this property is not in The City of Miami. You will not be able to proceed with this search here, and should contact the appropriate district.',
        'https://www.miami.gov/Permits-Construction/Property-Information/Run-a-Lien-or-Violation-Search',
        '2026-09-22',
      ),
      fee: q(
        'A form of payment (credit card or check). The fee is $200.',
        'https://www.miami.gov/Permits-Construction/Property-Information/Run-a-Lien-or-Violation-Search',
        '2026-09-22',
      ),
      turnaround: q(
        'NOTE: You are prompted to choose "new report" (if this is the first time you’re searching this particular property), or "print existing report" (if you ran this search previously and paid for it). […] IMPORTANT: Once you have paid for your "new report" you will have to come back to this screen and select "existing report" in order to view or print the actual report.',
        'https://www.miami.gov/Permits-Construction/Property-Information/Run-a-Lien-or-Violation-Search',
        '2026-09-22',
      ),
    },
    utility: {
      provider: {
        name: 'the Miami-Dade Water and Sewer Department, a county utility',
        url: 'https://www.miamidade.gov/global/water/my-account.page',
      },
      statement: q(
        'If payment is not received and an extension is not requested by the bill due date, a final notice will be mailed. If payment is not received within 14 days of the final notice, then the service may become eligible for disconnection. If the service is disconnected and remains unpaid for an additional 7 days, the account will be closed and any available deposits applied to the balance. A final bill will be generated with the remaining balance due or a refund will be issued in the case of a credit balance.',
        'https://www.miamidade.gov/global/water/my-account.page',
        '2026-09-22',
      ),
    },
    other: [
      {
        label: 'Releasing a recorded code lien',
        quote: q(
          'You will need to have a ticket number or case number to complete this request. A folio number will not be accepted. […] If you have unpaid fines, please contact the Finance Department for Pay off total at finance@miamigov.com. […] If your submission is complete and accurate (no errors, omissions, or misinformation provided), then you will receive a response through email within 3-5 business days, confirming that the Release of Lien has been sent to the County for recordation.',
          'https://www.miami.gov/My-Home-Neighborhood/Solve-a-Problem/Release-of-Lien-Request-RLN-for-Cityview-Citations-Only',
          '2026-09-22',
        ),
      },
      {
        label: 'The city’s stormwater fee rides the county water bill',
        quote: q(
          'The stormwater utility fee will appear on your Miami-Dade Water and Sewer Department bill, effective February 1, 2026. […] Residential properties (including single-family homes, condominium units, apartment or townhouse units, and mobile home units): $7.00 per month',
          'https://www.miami.gov/Notices/News-Notices/Notice-Regarding-Stormwater-Utility-Fee',
          '2026-09-22',
        ),
      },
      {
        label: 'Registering a vacant or abandoned structure or lot',
        quote: q(
          'Do you need to register a privately owned, empty lot or a vacant, blighted, unsecured or abandoned structure to avoid a fine? The City requires that these types of structures are registered with us in order to keep everyone safe. […] NOTE: If you have a violation, you will have to pay this invoice before receiving approval. […] Once your property is registered, the owner/agent is responsible for updating the registration annually.',
          'https://www.miami.gov/My-Home-Neighborhood/Register-Vacant-or-Abandoned-Structure-or-Lot',
          '2026-09-22',
        ),
      },
      {
        label: 'Building recertification',
        quote: q(
          'The City re-certifies structures to ensure they are safe for use and occupancy, as per the Miami-Dade County Code. […] Single family homes, duplexes, or structures that are 2,000 square feet or less and have an occupancy load of ten or less are exempt from recertification.',
          'https://www.miami.gov/Permits-Construction/Unsafe-Structures-Services/Get-a-Building-Recertification',
          '2026-09-22',
        ),
      },
      {
        label: 'Only the owner starts garbage service',
        quote: q(
          'Only the property owner may start new garbage and recycling service. If you are in a property with more than three units, you must contact a private, city-approved company to start your service.',
          'https://www.miami.gov/My-Home-Neighborhood/Garbage-Recycling/Start-New-Garbage-and-Recycling-Service',
          '2026-09-22',
        ),
      },
    ],
    notes:
      'Miami’s lien search is a $200 report generated inside iBuild against a folio that begins 01, printable once paid, with no business-day turnaround because there is no desk behind it. A code lien is released by an online request tied to the case number, after compliance and payment; mitigation of an accruing fine is a separate Code Enforcement Board hearing that needs an Affidavit of Compliance first. Water is the county’s, not the city’s.',
  },

  // --------------------------------------------------------------- Hollywood
  {
    citySlug: 'hollywood',
    government: 'City of Hollywood',
    building: {
      office: { name: 'Building Division', url: 'https://www.hollywoodfl.org/1545/Permits' },
      portal: { name: 'Accela Citizen Access', url: 'https://aca-prod.accela.com/HOLLYWOOD/Default.aspx' },
      expiredPermits: q(
        'Does my Building Permit expire? Issued permits expire if work is not commenced within 180 days or if abandoned for a period of 90 days. When a permit expires the permit holder is to submit the expired permit form and pay a fee to reactivate the permit. Prior to the issued permit expiring a onetime extension of 180 days from the initial expiration date can be added for a fee if the request for the extension is made prior to the expiration date of the initial permit. […] Prior to submitting a request form to obtain a CO or CC, all inspections must be "PF" – Passed Full and the permit must be in closed status.',
        'https://www.hollywoodfl.org/m/faq?cat=16',
      ),
    },
    codeEnforcement: {
      office: { name: 'Code Compliance', url: 'https://www.hollywoodfl.org/383/Code-Compliance' },
      hearingBody: q(
        'Special Magistrates, who are licensed attorneys, adjudicate cases that fail to come into voluntary compliance. […] The Special Magistrate is invested with the statutory authority found in chapter 162 of the Florida statutes to hear code enforcement cases. […] The Special Magistrate is authorized to hold hearings and impose fines, liens and other NON-criminal penalties against violators.',
        'https://www.hollywoodfl.org/383/Code-Compliance',
        '2026-09-22',
      ),
      liens: q(
        'When a property owner does not correct an outstanding Code Enforcement violation cited against a property, the City schedules a hearing before a Special Magistrate. If the violation remains outstanding and is not corrected after two scheduled hearings, the Special Magistrate assesses a fine against the property that accrues on a daily basis. The City also records the accruing fine as a lien in the public records of Broward County.',
        'https://www.hollywoodfl.org/492/Types-Of-Liens',
        '2026-09-22',
      ),
      release: q(
        'The City of Hollywood offers Lien Settlements for eligible property owners seeking consideration for lien reduction or release. Property owners may apply for review of qualifying property liens and submit documentation demonstrating compliance with applicable Code, Building, and Fire requirements. […] When a property owner pays an outstanding lien on a property, the property owner must also pay the accrued interest on the lien as well as a $40 fee to cover the City’s costs of processing and removing the lien from the county’s records (except for Code Enforcement liens, which are daily fines that accrue over time).',
        'https://www.hollywoodfl.org/220/Liens',
        '2026-09-22',
      ),
    },
    lienSearch: {
      office: { name: 'the city, through its Lien Search Request', url: 'https://www.hollywoodfl.org/489/Requesting-A-Lien-Search' },
      answeredBy: 'city',
      how: q(
        'Interested parties, such as title companies and individuals, can request the City to check its records for outstanding liens against a property. For a fee, the City will search its records and report any liens that appear in the records, as well as any other known outstanding charges or assessments against the property. […] A separate lien search request form is required for each parcel and must include the property identification number, the property address, and the owner of record.',
        'https://www.hollywoodfl.org/489/Requesting-A-Lien-Search',
        '2026-09-22',
      ),
      fee: q(
        'Lien search and certification fees are currently as follows: $160 for Residential Standard Service (8 - 10 business days) $243 for Residential Expedited Service (1 - 2 business days $321 for Non-Residential Standard Service (8 - 10 business days) $438 for Non-Residential Expedited Service (1-2 business days) Additional charges of $25 per meter may be assessed based on the number of meters on the property which must be paid separately by referencing the original request ID.',
        'https://www.hollywoodfl.org/489/Requesting-A-Lien-Search',
        '2026-09-22',
      ),
      turnaround: q(
        'As part of the Lien Search Report, the city will also disclose whether there are pending Code Enforcement violations or Building violations, which can become liens against the property. The City will also indicate whether there are any open Building permits on the property signifying there is work in progress at the property that may need to be completed or for which a final inspection must be scheduled.',
        'https://www.hollywoodfl.org/492/Types-Of-Liens',
        '2026-09-22',
      ),
    },
    utility: {
      provider: {
        name: 'the city’s Department of Public Utilities, for most addresses',
        url: 'https://www.hollywoodfl.org/217/Utility-Billing-Customer-Service',
      },
      statement: q(
        'Unpaid charges for utility service including water and sewer service, stormwater drainage, and garbage and commingled waste removal are liens against the property receiving the service. The City records most liens in the public records of Broward County. Pursuant to Florida Statutes, water and sewer service charges become statutory liens against a property upon becoming past due regardless of whether they are formally recorded in Broward County records.',
        'https://www.hollywoodfl.org/492/Types-Of-Liens',
        '2026-09-22',
      ),
    },
    other: [
      {
        label: 'Not every Hollywood address is on city water',
        quote: q(
          'Before applying, please confirm your address is served by the City of Hollywood Department of Public Utilities by calling Customer Service at 954-921-3938. Some addresses within the City of Hollywood are connected to Broward County or Town of Davie service providers. These properties may receive water from one provider and sewer service from another.',
          'https://www.hollywoodfl.org/217/Utility-Billing-Customer-Service',
          '2026-09-22',
        ),
      },
      {
        label: 'The final water bill',
        quote: q(
          'Final utility charges will be calculated through the requested service termination date. […] A final bill will be issued after your termination date and delivered according to your billing preference on file (regular mail or e-mail) within 2-3 weeks. When a tenant account closes, utility service responsibility returns to the property owner.',
          'https://www.hollywoodfl.org/1658/Close-Utility-Account',
          '2026-09-22',
        ),
      },
      {
        label: 'Board-up and demolition costs become liens',
        quote: q(
          'Under limited and usually urgent circumstances, the City must take action to board up and in some cases even demolish unsafe structures on properties. The City bills the property owner for the cost of demolishing or securing the property […] If the bill is not paid within 20 days, the City records a lien against the property in the public records of Broward County.',
          'https://www.hollywoodfl.org/492/Types-Of-Liens',
          '2026-09-22',
        ),
      },
      {
        label: 'An owner-builder permit restricts a sale',
        quote: q(
          'You cannot sell your house or duplex for one year after having a final inspection on any Owner builder permit.',
          'https://www.hollywoodfl.org/m/faq?cat=16',
        ),
      },
      {
        label: 'A rented house needs a business tax receipt',
        quote: q(
          'Chapter 110 of Hollywood’s municipal Code of Ordinances regarding local business tax requires owners of leased or rented single-family residential housing to obtain local business tax receipts. The code recognizes such residential property rentals - including single-family homes, townhomes, condos and duplexes - as businesses and considers each single-family building as a separate business location for local business tax purposes.',
          'https://www.hollywoodfl.org/495/Residential-Rental-Properties',
          '2026-09-22',
        ),
      },
      {
        label: 'Vacant property registration for lenders',
        quote: q(
          'In an effort to curtail the growing problem of abandoned and neglected properties, the City of Hollywood has enacted an Ordinance that requires lenders to register these properties with Code Compliance.',
          'https://www.hollywoodfl.org/570/Vacant-Property-Registration',
        ),
      },
    ],
    notes:
      'Hollywood publishes the fullest lien-search terms of any city here, and its report covers pending code and building violations and open permits as well as recorded liens. It also says a past-due water or sewer charge is a lien whether or not it was ever recorded, which is the reason the search asks the utility as well as the county.',
  },

  // ---------------------------------------------------------- Pembroke Pines
  {
    citySlug: 'pembroke-pines',
    government: 'City of Pembroke Pines',
    building: {
      office: { name: 'The Building Department', url: 'https://www.ppines.com/164/The-Building-Department' },
      portal: { name: 'the Development Hub', url: 'https://pembrokepinesfl-energovweb.tylerhost.net/apps/selfservice#/home' },
      expiredPermits: q(
        'Once a permit is issued: The permit has 180 calendar days to receive its first approved inspection. After the first approved inspection, the permit must have another approved inspection within 90 days. Failure to meet these deadlines will result in the expiration of the permit. […] If the Permit Expired Less Than 90 Days Ago Submit the following to the Building Department: Permit Renewal / Extension Request Form Updated Broward County Uniform Building Permit Application Updated Notice of Commencement Payment of the renewal fee (50% of the original permit fee) […] If the Permit Expired More Than 90 Days Ago […] Payment of the renewal fee (100% of the original permit fee) […] Important: Permits will not be renewed or extended until all applicable fees have been paid in full.',
        'https://www.ppines.com/1770/FAQs-EngSpan',
        '2026-09-22',
      ),
    },
    codeEnforcement: {
      office: { name: 'Code Compliance Unit', url: 'https://www.ppines.com/176/Code-Compliance' },
      hearingBody: q(
        'Code Compliance Magistrate Hearing Thursday, September 24, 2026',
        'https://www.ppines.com/Calendar.aspx?EID=7344',
        '2026-09-22',
      ),
      liens: q(
        'When various fines, fees, or charges remain unpaid by property owners, the City can exercise its legal right to place a lien against an owner’s property to ensure the eventual collection of an unpaid amount. […] For outstanding code violations (including violations that have not yet reached the lien status), please call 954-431-4466.',
        'https://www.ppines.com/236/Lien-Search',
        '2026-09-22',
      ),
      release: null,
    },
    lienSearch: {
      office: { name: 'the Finance Department’s Lien Search Program', url: 'https://www.ppines.com/236/Lien-Search' },
      answeredBy: 'city',
      how: q(
        'Interested parties, such as title companies and individuals, can request the City to check its records for outstanding liens against a property. To submit a manual search, please complete the Lien Inquiry Form and return it to: […] Note: The information we are providing refers to encumbrances that may exist on the property. Please contact the Building Department for open building permit searches. There may be other encumbrances against the property imposed by Broward County. Please contact the appropriate Broward County agency to obtain information about other encumbrances.',
        'https://www.ppines.com/236/Lien-Search',
        '2026-09-22',
      ),
      fee: null,
      turnaround: null,
    },
    utility: {
      provider: { name: 'the city’s Utilities Department', url: 'https://www.ppines.com/461/Utilities-Department' },
      statement: q(
        'Pursuant to section 50.33 (Am. Ord. 1978, passed 11-17-21) […] of the City of Pembroke Pines Code of Ordinances in accordance with Ch. 50.08, new utility accounts can only be opened in the owner’s name by the property owner or their designated representative. The security deposits for all new residential utility accounts shall be $100. […] The owner is fully responsible for all charges at the property until transferred to a new owner. […] Please note: All security deposits are applied to the final bill, therefore, all balances are to be settled at closing between the seller/buyer before starting the new service.',
        'https://www.ppines.com/1494/NEW-RESIDENTIAL-UTILITY-ACCOUNT',
        '2026-09-22',
      ),
    },
    other: [
      {
        label: 'Searching a code case yourself',
        quote: q(
          'If you are looking for information regarding a previous Code Compliance violation or any active Code violations for a particular property, please visit our Public Records page.',
          'https://www.ppines.com/176/Code-Compliance',
          '2026-09-22',
        ),
      },
      {
        label: 'Closing a permit',
        quote: q(
          'Certificate of Completion (CC) Confirms permitted work has been completed and all required inspections have passed. […] This certificate closes the permit once work is completed. […] Once you are ready to request your certificate, or if you have any questions regarding the close-out process, please contact the Building Department by email: PpinesCloseOutDocuments@cgasolutions.com',
          'https://www.ppines.com/1770/FAQs-EngSpan',
          '2026-09-22',
        ),
      },
      {
        label: 'Abandoned property registration',
        quote: q(
          'The City Commission of the City of Pembroke Pines adopted Ordinance 1660, which established Chapter 90.20 of the Code of Ordinances […] NOTE: Inspection and registration of the property by mortgagee must be done prior to the issuance of a notice of default.',
          'https://www.ppines.com/1047/AbandonedVacant-Property-Registration',
          '2026-09-22',
        ),
      },
      {
        label: 'Buildings of 25 years and older',
        quote: q(
          'Subsequent building safety inspections shall be required at 10-year intervals from the year the building or structure reaches 25 years of age, regardless of when the previous inspection report for the building or structure was finalized or filed.',
          'https://www.ppines.com/1484/BSIP-Building-Safety-Inspection-Program',
          '2026-09-22',
        ),
      },
    ],
    notes:
      'Pembroke Pines names its hearing officer only on its calendar, as the Code Compliance Magistrate, and publishes no route for reducing or releasing a code lien, no fee and no turnaround for its lien search, which sits behind a login. The Building Department is staffed through a contractor and answers open-permit searches separately from the Finance lien search.',
  },

  // ------------------------------------------------------------- Tallahassee
  {
    citySlug: 'tallahassee',
    government: 'City of Tallahassee',
    building: {
      office: {
        name: 'Building Inspection Division, in Growth Management',
        url: 'https://www.talgov.com/growth/gm_permits_buildins',
      },
      portal: { name: 'the Customer Permit Portal', url: 'https://cwpll.talgov.com/TallahasseePortal' },
      expiredPermits: q(
        'A building permit is valid for 180 days. Please note that a building permit’s expiration date is extended another 180 days each time a project receives an approved inspection. […] Yes, a building permit can be reinstated within 180 days after the expiration date of the permit.',
        'https://www.talgov.com/growth/gm_faqs/72.aspx',
        '2026-09-22',
      ),
    },
    codeEnforcement: {
      office: { name: 'Code Enforcement', url: 'https://www.talgov.com/publicsafety/CodeEnforcement' },
      hearingBody: q(
        'Citizen volunteer Magistrates and Code Board members provide a fair public hearing where they can order compliance actions or consider appeal requests.',
        'https://www.talgov.com/publicsafety/CodeEnforcement',
        '2026-09-22',
      ),
      liens: null,
      release: null,
    },
    lienSearch: {
      office: { name: 'the Treasurer-Clerk’s records office', url: 'https://www.talgov.com/doingbusiness/lien-search-request.aspx' },
      answeredBy: 'city',
      how: q(
        'Each request must be submitted using the online request system. Faxed or e-mailed requests will not be accepted. Payment must be made via credit card at the time each request is submitted. […] As part of each request, the City will search for the existence of liens or unpaid debts resulting from: City of Tallahassee Utilities (electric, water, sewer, gas, solid waste, etc.) S.H.I.P. / HOME / CDBG program loans for home repairs, accessibility improvements, etc. Leon County Fire Service Fees (for properties on the quarterly billing system)',
        'https://www.talgov.com/doingbusiness/lien-search-request.aspx',
        '2026-09-22',
      ),
      fee: q(
        'Fees assessed are per search. The Lien Search fee is $60.00 for each parcel number searched. Any subsequent requests for "updates" or "updated information" on a previous request will require the payment of an additional, full search fee.',
        'https://www.talgov.com/doingbusiness/lien-search-request.aspx',
        '2026-09-22',
      ),
      turnaround: q(
        'Requests require three to four working days to complete. City staff will not respond to inquiries regarding the "status" of a request. […] We encourage requestors to submit inquiries well in advance of the date needed as no "rush" requests will be accepted or honored. […] Please be advised that this information does not constitute an estoppel letter, in no way is a guarantee of clear title, and should not be used as a substitute for conducting a proper title search.',
        'https://www.talgov.com/doingbusiness/lien-search-request.aspx',
        '2026-09-22',
      ),
    },
    utility: {
      provider: { name: 'City of Tallahassee Utilities', url: 'https://www.talgov.com/you/you.aspx' },
      statement: q(
        'Residential deposits will be returned as a credit after three years if a customer maintains a good payment record or when the account is closed.',
        'https://www.talgov.com/you/you-customer-helpful-fees',
        '2026-09-22',
      ),
    },
    other: [
      {
        label: 'The city’s utility reaches beyond the city',
        quote: q(
          'the City of Tallahassee provides utility services to properties within the municipal boundaries (corporate limits) and to other properties within Leon, Gadsden, and Wakulla counties.',
          'https://www.talgov.com/doingbusiness/lien-search-request.aspx',
          '2026-09-22',
        ),
      },
      {
        label: 'The county fire fee, and where it lands when unpaid',
        quote: q(
          'County residents who are served by City of Tallahassee utilities have the County fire service fee included on their utility bill. All other properties are billed quarterly by the City of Tallahassee, on behalf of Leon County. Owners who fail to pay the quarterly County fire service fee are removed from the quarterly billing system, and the Fees are then placed on the Property Tax bill of the subject property.',
          'https://www.talgov.com/doingbusiness/lien-search-request.aspx',
          '2026-09-22',
        ),
      },
      {
        label: 'Some ordinance fines are the Clerk’s to collect',
        quote: q(
          'Collection of fines for some violations of municipal ordinances, such as animal control violations and false fire or burglar alarm violations, are administered by the Leon County Clerk of the Courts.',
          'https://www.talgov.com/doingbusiness/lien-search-request.aspx',
          '2026-09-22',
        ),
      },
      {
        label: 'Finishing a permit',
        quote: q(
          'A Certificate of Occupancy/Certificate of Completion is obtained by successfully completing all inspections that apply, including all subtrade permits. They are received through the Customer Permit Portal.',
          'https://www.talgov.com/growth/gm_faqs/77.aspx',
          '2026-09-22',
        ),
      },
    ],
    notes:
      'Tallahassee is its own electric, gas, water, sewer and solid-waste utility, and the city’s lien search is built around those accounts and the housing-programme loans it holds; the city says the result is not an estoppel letter. Its Code Enforcement page names magistrates and a code board but publishes nothing about how a code lien is reduced or released.',
  },
  // ------------------------------------------------------------------- Tampa
  {
    citySlug: 'tampa',
    government: 'City of Tampa',
    building: {
      office: { name: 'Construction Services Division', url: 'https://www.tampa.gov/construction-services' },
      portal: { name: 'Accela Citizen Access', url: 'https://aca-prod.accela.com/Tampa/Welcome.aspx' },
      expiredPermits: null,
    },
    codeEnforcement: {
      office: { name: 'Neighborhood Enhancement Division', url: 'https://www.tampa.gov/neighborhood-enhancement' },
      hearingBody: q(
        'The City of Tampa Code Enforcement Board ("CEB") is authorized under Chapter 162, Part I, Florida Statutes, and Chapter 9, Tampa City Code. This administrative board has the authority to issue administrative fines and other noncriminal penalties to provide an equitable, expeditious, effective, and inexpensive method of enforcing codes and ordinances where a pending or repeated violation continues to exist. Presently this function is handled through local code enforcement magistrates.',
        'https://www.tampa.gov/neighborhood-enhancement/code-enforcement-board-public-nuisance-abatement-board',
        '2026-09-22',
      ),
      liens: q(
        'The owner of record has the responsibility of resolving any active code action, failure to resolve the violations may result in a lien against the property after conveyance.',
        'https://www.tampa.gov/neighborhood-enhancement/lien-search',
        '2026-09-22',
      ),
      release: q(
        'The Legal Department, with the assistance of the Neighborhood Enhancement Department (NED), shall be responsible, upon the expiration of the jurisdiction of the CEB or CESM, for negotiating the settlement of fines imposed by the CEB and CESM. NED shall be responsible for the release the lien(s) from the properties. […] compliance with the relevant code requirements is determined by NED inspectors and reduced to writing through an affidavit of compliance. […] hard costs expenses expended by the City to abate a violation, are not negotiable and shall be paid in full prior to the execution and recordation of the release of lien(s).',
        'https://www.tampa.gov/sites/default/files/document/2025/253fc73b-8e6f-42b8-9782-75dd4cb89fa4_e.o-2022-16-policy-and-guidelines-for-the-settlement-and-recovery-of-code-enforcement-board-and-code-enforcement-special-magistrate-liens-2_remediated.pdf',
        '2026-09-22',
      ),
    },
    lienSearch: {
      office: {
        name: 'Conduits, a Net Assets Corporation system the Neighborhood Enhancement Division publishes through',
        url: 'https://www.tampa.gov/neighborhood-enhancement/lien-search',
      },
      answeredBy: 'vendor',
      how: q(
        'Search Code Enforcement Liens and Utility Balances — CONDUITS - City of Tampa — If you wish to obtain a lien payoff letter, visit http://conduits.nassets.net/fl/tampa.html. The City of Tampa provides this information through Conduits which is operated and supported by Net Assets Corporation.',
        'https://www.tampa.gov/neighborhood-enhancement/lien-search',
        '2026-09-22',
      ),
      fee: q(
        'There is a $25 non-refundable fee for this service, upon payment, you will be prompted to enter the property address, folio number, or PIN.',
        'https://www.tampa.gov/neighborhood-enhancement/lien-search',
        '2026-09-22',
      ),
      turnaround: q(
        'Lien searches are provided within 7 business days. The payoff settlement letter is valid for 45 days from the date of issuance.',
        'https://www.tampa.gov/neighborhood-enhancement/lien-search',
        '2026-09-22',
      ),
    },
    utility: {
      provider: { name: 'City of Tampa Utilities, in the Water Department', url: 'https://www.tampa.gov/city-of-tampa-utilities' },
      statement: q(
        'City of Tampa Utilities provides drinking water and wastewater (sanitary sewer) services to customers located in the City of Tampa, as well as parts of unincorporated Hillsborough County and Temple Terrace.',
        'https://www.tampa.gov/city-of-tampa-utilities',
        '2026-09-22',
      ),
    },
    other: [
      {
        label: 'The city’s published settlement schedule for a fine lien, once the property complies',
        quote: q(
          'Homestead Exempt Property: Where the violation(s) giving rise to the fine has been corrected and the property has been brought into compliance with code requirements, a fine which exceeds $250 on homestead exempt property, may be settled in accordance with the following guidelines: 1. $250 when correction of violation(s) occurred within 1 year of compliance deadlines. 2. $500.00 when correction of violation(s) occurred between 1 and 2 years of compliance deadline. 3. $1,000.00 when correction of violation(s) occurred after 2 years of compliance deadline. […] Non-Homestead Exempt Property: […] 1. $500.00 when correction of violation(s) occurred within 1 year of compliance deadline. 2. $1,000.00 when correction of violation(s) occurred between 1 and 2 years of compliance deadline. 3. $3,000.00 when correction of violation(s) occurred between 2 and 3 years of compliance deadline 4. $4,000.00 when correction of violations occurred between 3 and 4 years of compliance deadline 5. $5,000.00 when correction of violations occurred after 4 years of compliance deadline.',
          'https://www.tampa.gov/sites/default/files/document/2025/253fc73b-8e6f-42b8-9782-75dd4cb89fa4_e.o-2022-16-policy-and-guidelines-for-the-settlement-and-recovery-of-code-enforcement-board-and-code-enforcement-special-magistrate-liens-2_remediated.pdf',
          '2026-09-22',
        ),
      },
      {
        label: 'A buyer of a property that still does not comply',
        quote: q(
          'NEW OWNER PROGRAM: When the code violation(s) giving rise to the fine has not been brought into compliance and the property is being or has been transferred to a bona-fide third party in an arm’s length transaction, the Legal Department may propose an offer of settlement to the new owner or proposed purchaser requiring the active violation(s) be brought into compliance within a time certain in order to negotiate a settlement consistent with the guidelines set forth in Section II herein. The offer of settlement provided by the Legal Department shall not be transferrable.',
          'https://www.tampa.gov/sites/default/files/document/2025/253fc73b-8e6f-42b8-9782-75dd4cb89fa4_e.o-2022-16-policy-and-guidelines-for-the-settlement-and-recovery-of-code-enforcement-board-and-code-enforcement-special-magistrate-liens-2_remediated.pdf',
          '2026-09-22',
        ),
      },
      {
        label: 'A tax deed buyer gets no negotiated settlement',
        quote: q(
          'Pursuant to Executive Order 2022-16, properties sold via tax deed sale are not eligible for negotiated settlements pursuant to the guidelines established in the Executive Order. Accordingly, tax deed purchasers have the option of allowing the tax deed process to complete to determine any remaining lien amounts or expediting the release of the liens by satisfying the total amount of the existing liens at the time of purchase.',
          'https://www.tampa.gov/neighborhood-enhancement/lien-search',
          '2026-09-22',
        ),
      },
      {
        label: 'Why a completion certificate is held up',
        quote: q(
          'Top reasons your Completion Certificate(s) may be delayed […] Fees due not paid. Contact: CSDhelp@tampagov.net for assistance. […] Child Permit Record(s) expired Contact: CSDhelp@tampagov.net for assistance. […] Final Inspections (MEP, FIRE & BLD) on Parent and/or Child Record(s) are not approved',
          'https://www.tampa.gov/construction-services/ready-for-completion',
          '2026-09-22',
        ),
      },
      {
        label: 'The final water bill, and split providers',
        quote: q(
          'A final bill will be sent to you at your forwarding address. Please allow up to 5 business days for your request to be processed. […] Please note that locations serviced by multiple utility providers will receive separate utility bills from each provider. For example, a location with water provided by the City of Tampa, and wastewater and solid waste serviced by Hillsborough County will receive two separate utility bills',
          'https://www.tampa.gov/city-of-tampa-utilities/stop-service',
          '2026-09-22',
        ),
      },
      {
        label: 'Two stormwater assessments ride the tax bill',
        quote: q(
          'Service Assessment - Annual Non-Ad Valorem assessment that pays for operations and maintenance of the existing stormwater system. […] Improvement Assessment - Annual Non-Ad Valorem assessment, that pays for capital improvements associated with the stormwater system in the Central and Lower Improvement Area.',
          'https://www.tampa.gov/mobility/stormwater/programs/assessment',
          '2026-09-22',
        ),
      },
      {
        label: 'Foreclosure registry',
        quote: q(
          'This is an ordinance which requires the registration of vacant properties that are in foreclosure or have been foreclosed to register annually with the City of Tampa. See City of Tampa Code of Ordinances 19-133 and 19-135. […] Q. Is there a fee to register? A. Yes, there is an annual $125.00 fee',
          'https://www.tampa.gov/document/foreclosure-registry-frequently-asked-questions-and-answers-7676',
          '2026-09-22',
        ),
      },
    ],
    notes:
      'Tampa is unusual in publishing a fixed settlement schedule for a code fine lien, by how late compliance came and whether the property is homestead, in an executive order; the city’s abatement costs are never negotiable under it. The lien and payoff letter is a $25 vendor product through Conduits. The city publishes no procedure for reinstating an expired permit, only the reasons a completion certificate is delayed.',
  },

  // ---------------------------------------------------------------- Palm Bay
  {
    citySlug: 'palm-bay',
    government: 'City of Palm Bay',
    building: {
      office: {
        name: 'Building Department',
        url: 'https://www.palmbayfl.gov/government/city-departments-a-to-e/building-permits-inspections',
      },
      portal: { name: 'the iMS e-Portal', url: 'https://ims.palmbayfl.gov' },
      expiredPermits: null,
    },
    codeEnforcement: {
      office: {
        name: 'Code Compliance Division, in Growth Management',
        url: 'https://www.palmbayfl.gov/government/city-departments-f-to-z/growth-management/code-compliance-violations-complaints',
      },
      hearingBody: q(
        'Code Enforcement Special Magistrate Board - 2nd Wednesday of each month, 1:00 p.m. […] Special Magistrate Hearing - 3rd Wednesday of each month, 1:00 p.m.',
        'https://www.palmbayfl.gov/government/city-departments-f-to-z/legislative/boards-committees/code-enforcement-board-special-magistrate-hearings',
      ),
      liens: null,
      release: q(
        'To apply for a reduction of a lien due to a code violation with the City of Palm Bay, please download the Petition for Relief Form and once completed, return it to the City of Palm Bay Code Compliance.',
        'https://www.palmbayfl.gov/government/city-departments-f-to-z/growth-management/code-compliance-violations-complaints',
      ),
    },
    lienSearch: {
      office: {
        name: 'Orange Data, under contract to the city',
        url: 'https://www.palmbayfl.gov/business/business-resources/lien-research',
      },
      answeredBy: 'vendor',
      how: q(
        'Effective March 1, 2022, Orange Data has been contracted to provide liens searches for the City of Palm Bay. Follow the link to access the City of Palm Bay Open lien Search Request Portal on the Orange Data website. You will need to create an account with Orange Data to submit lien requests. […] City Lien documents are recorded in the "Official Records" of the Brevard County Clerk of Courts. Documents are recorded by property owner name.',
        'https://www.palmbayfl.gov/business/business-resources/lien-research',
      ),
      fee: q(
        'Each lien search is $60.00 and requests will be expedited.',
        'https://www.palmbayfl.gov/business/business-resources/lien-research',
      ),
      turnaround: null,
    },
    utility: {
      provider: { name: 'City of Palm Bay Utilities', url: 'https://www.palmbayfl.gov/government/city-departments-f-to-z/utilities' },
      statement: q(
        'The Utilities Department will be transitioning residents currently on quarterly billing for Republic Services and Stormwater to monthly billing. The last quarterly bill will be issued on 04/23/2026, with the first monthly bill to be issued on 07/23/2026.',
        'https://www.palmbayfl.gov/government/city-departments-f-to-z/utilities',
      ),
    },
    other: [
      {
        label: 'What the Petition for Relief asks an applicant to attest',
        quote: q(
          'APPLICANT MUST ATTEST TO THE FOLLOWING BY INITIALING EACH ITEM: All ad valorem property taxes, special assessments, utility charges and other government liens against the real property have been paid. All Code violations have been corrected or a repair agreement has been executed. […] NOTE: IF THE HOUSE IS OCCUPIED, YOU MUST BE PRESENT AT THE RESIDENCE ON THE DATE OF INSPECTION.',
          'https://www.palmbayfl.gov/home/showpublisheddocument/22817/637021509378270000',
        ),
      },
      {
        label: 'Code payments and inquiries go through the same portal as permits',
        quote: q(
          'Beginning March 6, 2023, the City of Palm Bay will offer a new online software solution, Intuitive Municipal Solutions (iMS), to streamline the process for code complaints, lien payments, and inquiries that can be found on the City website at www.pbfl.org/code.',
          'https://www.palmbayfl.gov/government/city-departments-f-to-z/growth-management/code-compliance-violations-complaints',
        ),
      },
      {
        label: 'Zoning and public-works permits are permits too',
        quote: q(
          'Zoning and Public Works permits are not exempt from permits as these are ordinances and not Florida Building Code related. Fences not involving a pool, concrete flatwork not involving a future structure, and small sheds under 120 sq ft will still require permits through Land Development. These permits are applied for through the IMS system and will be assigned a building permit number but are not reviewed by the Building Department.',
          'https://www.palmbayfl.gov/government/city-departments-a-to-e/building-permits-inspections',
        ),
      },
    ],
    notes:
      'Palm Bay contracts its lien search to Orange Data and its foreclosure registry to a second vendor; the Petition for Relief to the Special Magistrate, which a prospective buyer may file, is the one lien matter the city handles itself. Every Palm Bay page was read on 20 September; on 22 September the city’s site refused all automated requests, so nothing here could be re-read that day.',
  },
];
