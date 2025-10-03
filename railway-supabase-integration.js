// =====================================================
// Railway Server - Supabase Integration
// =====================================================
// Framer CMS와 Supabase 연동을 위한 Railway 서버 코드

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Framer CMS API 설정
const FRAMER_API_BASE = 'https://api.framer.com/v1/cms';
const FRAMER_API_KEY = process.env.FRAMER_API_KEY; // Framer API 키 필요

// =====================================================
// 1. Framer CMS에서 상품 데이터 가져오기
// =====================================================

/**
 * Framer CMS에서 상품 데이터를 가져오는 함수
 * @param {string} collection - 컬렉션 이름 (notion_templates, goodnote_templates)
 * @returns {Array} 상품 데이터 배열
 */
const fetchFramerCMSData = async (collection) => {
  try {
    console.log(`Fetching ${collection} from Framer CMS...`);
    
    const response = await axios.get(`${FRAMER_API_BASE}/${collection}`, {
      headers: {
        'Authorization': `Bearer ${FRAMER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Successfully fetched ${response.data.items.length} items from ${collection}`);
    return response.data.items;
    
  } catch (error) {
    console.error(`Error fetching ${collection}:`, error.message);
    throw error;
  }
};

// =====================================================
// 2. Supabase에 상품 데이터 동기화
// =====================================================

/**
 * Framer CMS 데이터를 Supabase에 동기화하는 함수
 * @param {string} collection - 컬렉션 이름
 * @param {Array} products - 상품 데이터 배열
 * @returns {Object} 동기화 결과
 */
const syncProductsToSupabase = async (collection, products) => {
  try {
    console.log(`Syncing ${products.length} products from ${collection} to Supabase...`);
    
    const { data, error } = await supabase.rpc('sync_framer_products', {
      p_collection_name: collection,
      p_products: products
    });
    
    if (error) {
      console.error(`Error syncing ${collection}:`, error);
      throw error;
    }
    
    console.log(`Successfully synced ${collection}:`, data);
    return data;
    
  } catch (error) {
    console.error(`Error syncing ${collection} to Supabase:`, error.message);
    throw error;
  }
};

// =====================================================
// 3. 전체 상품 동기화 함수
// =====================================================

/**
 * 모든 상품을 Framer CMS에서 Supabase로 동기화
 * @returns {Object} 동기화 결과
 */
const syncAllProducts = async () => {
  try {
    console.log('Starting full product sync from Framer CMS to Supabase...');
    
    const results = {};
    
    // Notion Templates 동기화
    try {
      const notionTemplates = await fetchFramerCMSData('notion_templates');
      results.notion_templates = await syncProductsToSupabase('notion_templates', notionTemplates);
    } catch (error) {
      console.error('Failed to sync notion_templates:', error.message);
      results.notion_templates = { error: error.message };
    }
    
    // GoodNote Templates 동기화
    try {
      const goodnoteTemplates = await fetchFramerCMSData('goodnote_templates');
      results.goodnote_templates = await syncProductsToSupabase('goodnote_templates', goodnoteTemplates);
    } catch (error) {
      console.error('Failed to sync goodnote_templates:', error.message);
      results.goodnote_templates = { error: error.message };
    }
    
    console.log('Full product sync completed:', results);
    return results;
    
  } catch (error) {
    console.error('Error in full product sync:', error.message);
    throw error;
  }
};

// =====================================================
// 4. 동기화 상태 조회
// =====================================================

/**
 * 동기화 상태를 조회하는 함수
 * @returns {Array} 동기화 상태 배열
 */
const getSyncStatus = async () => {
  try {
    const { data, error } = await supabase.rpc('get_sync_status');
    
    if (error) {
      console.error('Error getting sync status:', error);
      throw error;
    }
    
    return data;
    
  } catch (error) {
    console.error('Error getting sync status:', error.message);
    throw error;
  }
};

// =====================================================
// 5. API 엔드포인트 추가 (기존 server.js에 추가)
// =====================================================

/**
 * 기존 Railway server.js에 추가할 API 엔드포인트들
 */

// 상품 동기화 API
app.post('/api/sync/products', async (req, res) => {
  try {
    const results = await syncAllProducts();
    res.json({
      success: true,
      message: 'Product sync completed',
      results: results
    });
  } catch (error) {
    console.error('Product sync API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 동기화 상태 조회 API
app.get('/api/sync/status', async (req, res) => {
  try {
    const status = await getSyncStatus();
    res.json({
      success: true,
      status: status
    });
  } catch (error) {
    console.error('Sync status API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 특정 컬렉션 동기화 API
app.post('/api/sync/collection/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    
    if (!['notion_templates', 'goodnote_templates'].includes(collection)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid collection name'
      });
    }
    
    const products = await fetchFramerCMSData(collection);
    const result = await syncProductsToSupabase(collection, products);
    
    res.json({
      success: true,
      message: `${collection} sync completed`,
      result: result
    });
    
  } catch (error) {
    console.error('Collection sync API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// 6. 정기 동기화 스케줄 (선택사항)
// =====================================================

/**
 * 정기적으로 상품을 동기화하는 함수 (선택사항)
 * 예: 매시간마다 동기화
 */
const scheduleProductSync = () => {
  // 매시간마다 동기화 (3600000ms = 1시간)
  setInterval(async () => {
    try {
      console.log('Starting scheduled product sync...');
      await syncAllProducts();
      console.log('Scheduled product sync completed');
    } catch (error) {
      console.error('Scheduled product sync failed:', error.message);
    }
  }, 3600000); // 1시간마다 실행
  
  console.log('Product sync scheduled every hour');
};

// 서버 시작 시 정기 동기화 활성화 (선택사항)
// scheduleProductSync();

// =====================================================
// 7. 초기 동기화 (서버 시작 시)
// =====================================================

/**
 * 서버 시작 시 초기 동기화 실행
 */
const initializeProductSync = async () => {
  try {
    console.log('Initializing product sync...');
    await syncAllProducts();
    console.log('Initial product sync completed');
  } catch (error) {
    console.error('Initial product sync failed:', error.message);
  }
};

// 서버 시작 시 초기 동기화 실행 (선택사항)
// initializeProductSync();

// =====================================================
// 8. 모듈 내보내기
// =====================================================

module.exports = {
  fetchFramerCMSData,
  syncProductsToSupabase,
  syncAllProducts,
  getSyncStatus,
  scheduleProductSync,
  initializeProductSync
};

// =====================================================
// 사용법 안내
// =====================================================

/*
1. Railway 환경 변수에 추가:
   - FRAMER_API_KEY: Framer API 키
   - SUPABASE_URL: Supabase 프로젝트 URL
   - SUPABASE_SERVICE_ROLE_KEY: Supabase Service Role 키

2. 기존 server.js에 이 코드 추가:
   const { syncAllProducts, getSyncStatus } = require('./railway-supabase-integration');

3. API 엔드포인트 사용:
   - POST /api/sync/products - 전체 상품 동기화
   - GET /api/sync/status - 동기화 상태 조회
   - POST /api/sync/collection/notion_templates - 특정 컬렉션 동기화

4. 수동 동기화:
   curl -X POST https://your-railway-app.up.railway.app/api/sync/products

5. 동기화 상태 확인:
   curl https://your-railway-app.up.railway.app/api/sync/status
*/
