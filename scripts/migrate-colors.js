#!/usr/bin/env node

/**
 * 색상 마이그레이션 자동화 스크립트
 * 하드코딩된 색상을 컬러 시스템 상수로 교체합니다.
 */

const fs = require('fs');
const path = require('path');

// 색상 매핑 테이블
const colorMappings = {
  // Primary colors
  '#45DA31': 'PRIMARY[600]',
  '#45da31': 'PRIMARY[600]',
  '#59EC3A': 'PRIMARY[500]',
  '#59ec3a': 'PRIMARY[500]',
  '#EEFEE9': 'PRIMARY[50]',
  '#eefee9': 'PRIMARY[50]',
  '#00AF1F': 'PRIMARY[800]',
  '#21C427': 'PRIMARY[700]',
  '#71F155': 'PRIMARY[400]',
  '#92F579': 'PRIMARY[300]',
  '#B5F9A3': 'PRIMARY[200]',
  '#D4FBC8': 'PRIMARY[100]',

  // Grey scale
  '#FAFAFA': 'GREY[50]',
  '#fafafa': 'GREY[50]',
  '#F5F5F5': 'GREY[50]',
  '#f5f5f5': 'GREY[50]',
  '#EDEDED': 'GREY[100]',
  '#DFDFDF': 'GREY[200]',
  '#BCBCBC': 'GREY[300]',
  '#bcbcbc': 'GREY[300]',
  '#B4B4B4': 'GREY[400]',
  '#9D9D9D': 'GREY[500]',
  '#9d9d9d': 'GREY[500]',
  '#999999': 'GREY[400]',
  '#747474': 'GREY[600]',
  '#666666': 'GREY[700]',
  '#606060': 'GREY[700]',
  '#414141': 'GREY[800]',
  '#202020': 'GREY[900]',
  '#2B2B2B': 'GREY[900]',
  '#2b2b2b': 'GREY[900]',
  '#FFFFFF': 'GREY.WHITE',
  '#ffffff': 'GREY.WHITE',

  // Alert colors
  '#FF4032': 'ALERT[500]',
  '#ff4032': 'ALERT[500]',
  '#F9514E': 'ALERT[400]',
  '#F69A9A': 'ALERT[200]',
  '#FFCDD2': 'ALERT[100]',
  '#ffebee': 'ALERT[50]',
  '#FF6B6B': 'ALERT[400]',
  '#F76F71': 'ALERT[400]',
  '#F03532': 'ALERT.DEFAULT',
  '#f03532': 'ALERT.DEFAULT',

  // Sub colors (Blue)
  '#3283ff': 'SUB.DEFAULT',
  '#2B91FF': 'SUB[500]',
  '#42a2ff': 'SUB[400]',
  '#91c9ff': 'SUB[200]',
  '#bcddff': 'SUB[100]',
  '#e3f2ff': 'SUB[50]',
  '#66EAF1': 'SUB.SECONDARY',
  '#71DCF9': 'SUB.SECONDARY', // Purchase button

  // Other common colors
  '#34C759': 'PRIMARY[600]', // iOS success green, 우리 primary와 비슷
  '#00C851': 'PRIMARY[700]', // Point positive
  '#00C853': 'PRIMARY[700]', // Point positive
  '#CCCCCC': 'GREY[300]',
  '#c9c9c9': 'GREY[300]',
  '#E0E0E0': 'GREY[200]',
  '#E5E5E5': 'GREY[200]',
  '#F0F0F0': 'GREY[100]',
  '#f0f0f0': 'GREY[100]',
};

function needsColorImport(content) {
  // 이미 import가 있는지 확인
  if (content.includes('from \'~/shared/styles\'')) {
    return false;
  }

  // 색상 코드가 있는지 확인
  for (const color of Object.keys(colorMappings)) {
    if (content.includes(color)) {
      return true;
    }
  }
  return false;
}

function getRequiredImports(content) {
  const imports = new Set();

  for (const [color, replacement] of Object.entries(colorMappings)) {
    if (content.includes(color)) {
      if (replacement.startsWith('PRIMARY')) imports.add('PRIMARY');
      else if (replacement.startsWith('GREY')) imports.add('GREY');
      else if (replacement.startsWith('ALERT')) imports.add('ALERT');
      else if (replacement.startsWith('SUB')) imports.add('SUB');
    }
  }

  return Array.from(imports);
}

function addImportStatement(content, imports) {
  if (imports.length === 0) return content;

  const importStatement = `import { ${imports.join(', ')} } from '~/shared/styles';\n`;

  // React import 다음에 추가
  const reactImportMatch = content.match(/import.*from\s+['"]react['"]\s*;?\n/);
  if (reactImportMatch) {
    const insertPos = reactImportMatch.index + reactImportMatch[0].length;
    return content.slice(0, insertPos) + importStatement + content.slice(insertPos);
  }

  // 첫 번째 import 다음에 추가
  const firstImportMatch = content.match(/import.*\n/);
  if (firstImportMatch) {
    const insertPos = firstImportMatch.index + firstImportMatch[0].length;
    return content.slice(0, insertPos) + importStatement + content.slice(insertPos);
  }

  // import가 없으면 파일 시작에 추가
  return importStatement + content;
}

function replaceColors(content) {
  let modified = content;

  for (const [color, replacement] of Object.entries(colorMappings)) {
    // ' 사용한 경우
    const regex1 = new RegExp(`['"]${color}['"]`, 'g');
    modified = modified.replace(regex1, replacement);

    // " 사용한 경우  (이미 위에서 처리됨)
    // const regex2 = new RegExp(`"${color}"`, 'g');
    // modified = modified.replace(regex2, replacement);
  }

  return modified;
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    if (!needsColorImport(content)) {
      return { changed: false };
    }

    // 필요한 import 결정
    const requiredImports = getRequiredImports(content);

    // 색상 교체
    content = replaceColors(content);

    // import 추가
    content = addImportStatement(content, requiredImports);

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      return { changed: true, imports: requiredImports };
    }

    return { changed: false };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return { changed: false, error: error.message };
  }
}

function findTsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // node_modules, .git 등 제외
      if (!file.startsWith('.') && file !== 'node_modules') {
        findTsxFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// 메인 실행
function main() {
  const srcDir = path.join(__dirname, '../src');

  console.log('🎨 색상 마이그레이션 시작...\n');

  const files = findTsxFiles(srcDir);
  console.log(`📁 총 ${files.length}개 파일 검사 중...\n`);

  let changedCount = 0;
  const changedFiles = [];

  files.forEach(file => {
    const result = processFile(file);
    if (result.changed) {
      changedCount++;
      const relativePath = path.relative(srcDir, file);
      changedFiles.push({
        path: relativePath,
        imports: result.imports,
      });
      console.log(`✅ ${relativePath}`);
      if (result.imports) {
        console.log(`   Import 추가: ${result.imports.join(', ')}`);
      }
    } else if (result.error) {
      console.log(`❌ ${path.relative(srcDir, file)}: ${result.error}`);
    }
  });

  console.log(`\n🎉 완료! ${changedCount}개 파일 업데이트됨`);

  if (changedFiles.length > 0) {
    console.log('\n📝 변경된 파일 목록:');
    changedFiles.forEach(({ path }) => {
      console.log(`  - ${path}`);
    });
  }
}

if (require.main === module) {
  main();
}

module.exports = { processFile, replaceColors, addImportStatement };
