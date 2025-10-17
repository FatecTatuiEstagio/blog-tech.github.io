// upload-to-cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const dir = './assets/audios';
const files = fs.readdirSync(dir);
const outputFile = './_data/audios.json';
let uploaded = [];

// Lê cache anterior, se existir
if (fs.existsSync(outputFile)) {
  uploaded = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
}

// Transforma lista em mapa para busca rápida
const uploadedMap = new Map(uploaded.map((item) => [item.file, item.url]));

// Lista final que será escrita (mantém os antigos + novos)
const finalList = [...uploaded];

for (const file of files) {
  if (uploadedMap.has(file)) {
    console.log(`⏩ Já enviado: ${file}`);
    continue;
  }

  const filePath = path.join(dir, file);
  const publicId = `entrevistas/${path.parse(file).name}`;

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'auto',
      public_id: publicId,
      unique_filename: false, // mantém nome fixo
      overwrite: false,       // não sobrescreve se já existir
    });

    finalList.push({ file, url: result.secure_url });
    console.log(`✅ Enviado: ${file}`);
  } catch (error) {
    if (error.error && error.error.http_code === 409) {
      // Já existe no Cloudinary
      console.log(`⚠️ Já existente no Cloudinary: ${file}`);
    } else {
      console.error(`❌ Erro ao enviar ${file}:`, error.message);
    }
  }
}

// Salva lista atualizada
fs.writeFileSync(outputFile, JSON.stringify(finalList, null, 2));
console.log('🟢 Upload verificado e sincronizado com Cloudinary!');
