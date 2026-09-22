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
];
