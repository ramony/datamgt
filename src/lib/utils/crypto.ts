import AES from "crypto-js/aes";
import Utf8 from "crypto-js/enc-utf8";

const fallbackKey = "datamgt-local-dev-key";

function getKey() {
  return process.env.ENCRYPTION_KEY || fallbackKey;
}

export function encryptPassword(password: string) {
  return AES.encrypt(password || "", getKey()).toString();
}

export function decryptPassword(encrypted: string) {
  const bytes = AES.decrypt(encrypted || "", getKey());
  return bytes.toString(Utf8);
}
