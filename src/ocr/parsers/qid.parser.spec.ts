import { parseQidText } from './qid.parser';

describe('parseQidText', () => {
  it('extracts Qatar ID fields from labeled OCR text', () => {
    const fields = parseQidText(`
      State of Qatar
      ID Number: 28563412987
      Name: Fatima Ahmed
      Nationality: QATAR
      Date of Birth: 12/05/1985
      Date of Issue: 01/01/2024
      Date of Expiry: 01/01/2029
    `);

    expect(fields).toEqual({
      issuingState: 'State of Qatar',
      documentType: '',
      qidNumber: '28563412987',
      name: 'Fatima Ahmed',
      nationality: 'QATAR',
      dateOfBirth: '1985-05-12',
      issueDate: '2024-01-01',
      expiryDate: '2029-01-01',
    });
  });

  it('extracts an unlabeled 11 digit QID number', () => {
    const fields = parseQidText(`
      STATE OF QATAR
      28563412987
      Resident Permit
    `);

    expect(fields.qidNumber).toBe('28563412987');
  });

  it('extracts all available fields from PaddleOCR QID text', () => {
    const fields = parseQidText(`
      State Of Qatar
      ResidencyPermit
      ID.No:
      29940001527
      D.O.B:
      19/10/1999
      Expiry:
      24/11/2027
      Nationality:
      JORDAN
      Occupation:
      Name: BADER FERAS WASFIALHATAB
    `);

    expect(fields).toEqual({
      issuingState: 'State Of Qatar',
      documentType: 'ResidencyPermit',
      qidNumber: '29940001527',
      name: 'BADER FERAS WASFIALHATAB',
      dateOfBirth: '1999-10-19',
      nationality: 'JORDAN',
      issueDate: '',
      expiryDate: '2027-11-24',
    });
  });

  it('returns empty strings when OCR text is incomplete', () => {
    const fields = parseQidText('Resident Permit');

    expect(fields).toEqual({
      issuingState: '',
      documentType: 'Resident Permit',
      qidNumber: '',
      name: '',
      dateOfBirth: '',
      nationality: '',
      issueDate: '',
      expiryDate: '',
    });
  });
});
