export const DRIVE_OWNER_ID = "70791dfb-637c-49ec-bbd3-0b1d92c250c0";
export const canUseCompanyDrive = (userId: string, isAdmin: boolean) => userId === DRIVE_OWNER_ID && isAdmin;