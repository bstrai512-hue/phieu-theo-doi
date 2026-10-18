import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/vi';
dayjs.extend(customParseFormat);
dayjs.locale('vi');
export { dayjs };
export const parseDay=(value:string)=>dayjs(value,'YYYY-MM-DD',true);
