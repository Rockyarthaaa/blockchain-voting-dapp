const fs = require('fs');
const { Wallet } = require('ethers');
const path = require('path');

async function extractPrivateKey() {
  try {
    // Path ke keystore file
    const keystorePath = path.join(__dirname, 'chaindata/keystore/UTC--2025-10-28T13-42-23.094421100Z--3e8e877b88f0fa014421abf6954aabb1ee2d51be');
    
    // Baca keystore file
    const keystoreJson = fs.readFileSync(keystorePath, 'utf8');
    
    // Password keystore
    const password = '000';
    
    console.log('🔐 Membuka keystore file...');
    console.log('📂 Path:', keystorePath);
    console.log('');
    
    // Decrypt keystore
    const wallet = await Wallet.fromEncryptedJson(keystoreJson, password);
    
    console.log('✅ Berhasil extract private key!');
    console.log('');
    console.log('📋 Informasi Account:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Address     :', wallet.address);
    console.log('Private Key :', wallet.privateKey);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('PENTING: Jangan share private key ini ke siapapun!');
    console.log('');
    console.log('Copy private key di atas (tanpa 0x) dan paste ke file .env');
    console.log('   Contoh: PRIVATE_KEY=abc123def456...');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
    console.log('Troubleshooting:');
    console.log('   - Pastikan path keystore file benar');
    console.log('   - Pastikan password benar (current: "000")');
  }
}

extractPrivateKey();