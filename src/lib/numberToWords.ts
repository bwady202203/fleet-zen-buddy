// تحويل الأرقام إلى كلمات عربية (تفقيط)

const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

function convertLessThanThousand(num: number): string {
  if (num === 0) return '';
  
  let result = '';
  
  // المئات
  const hundredsDigit = Math.floor(num / 100);
  if (hundredsDigit > 0) {
    result += hundreds[hundredsDigit];
  }
  
  // العشرات والآحاد
  const remainder = num % 100;
  
  if (remainder >= 10 && remainder <= 19) {
    result += (result ? ' و' : '') + teens[remainder - 10];
  } else {
    const tensDigit = Math.floor(remainder / 10);
    const onesDigit = remainder % 10;
    
    if (tensDigit > 0) {
      result += (result ? ' و' : '') + tens[tensDigit];
    }
    
    if (onesDigit > 0) {
      result += (result ? ' و' : '') + ones[onesDigit];
    }
  }
  
  return result;
}

export function numberToWords(num: number): string {
  if (num === 0) return 'صفر ريال سعودي';
  
  // فصل الجزء الصحيح عن الكسري
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);
  
  let result = '';
  
  // الملايين
  const millions = Math.floor(integerPart / 1000000);
  if (millions > 0) {
    if (millions === 1) {
      result += 'مليون';
    } else if (millions === 2) {
      result += 'مليونان';
    } else if (millions <= 10) {
      result += convertLessThanThousand(millions) + ' ملايين';
    } else {
      result += convertLessThanThousand(millions) + ' مليون';
    }
  }
  
  // الآلاف
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  if (thousands > 0) {
    if (result) result += ' و';
    if (thousands === 1) {
      result += 'ألف';
    } else if (thousands === 2) {
      result += 'ألفان';
    } else if (thousands <= 10) {
      result += convertLessThanThousand(thousands) + ' آلاف';
    } else {
      result += convertLessThanThousand(thousands) + ' ألف';
    }
  }
  
  // المئات
  const remainder = integerPart % 1000;
  if (remainder > 0) {
    if (result) result += ' و';
    result += convertLessThanThousand(remainder);
  }
  
  result += ' ريال سعودي';
  
  // الهللات
  if (decimalPart > 0) {
    result += ' و' + convertLessThanThousand(decimalPart) + ' هللة';
  }
  
  return result + ' فقط لا غير';
}
