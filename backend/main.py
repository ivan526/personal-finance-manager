from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import akshare as ak
from typing import List, Dict, Optional
import asyncio

app = FastAPI(title="FinSpace 基金数据接口", description="为FinSpace个人理财系统提供基金数据支持")

# 配置CORS，允许本地所有源访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "tauri://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FundBatchRequest(BaseModel):
    fund_codes: List[str]

class FundInfo(BaseModel):
    fund_code: str
    fund_name: str
    fund_type: Optional[str]
    fund_company: Optional[str]
    latest_nav: float
    latest_nav_date: str
    day_growth: Optional[float]
    last_1_month: Optional[float]
    last_3_month: Optional[float]
    last_6_month: Optional[float]
    last_1_year: Optional[float]

@app.get("/")
async def root():
    return {"message": "FinSpace 基金数据接口服务运行正常"}

# 基金名称缓存：启动时加载一次，后续复用
_fund_name_cache: Dict[str, str] = {}

def _load_fund_name_cache():
    """预加载全部基金名称到内存缓存"""
    try:
        fund_list = ak.fund_name_em()
        for _, row in fund_list.iterrows():
            code = str(row.get('基金代码', '')).strip()
            name = str(row.get('基金简称', '')).strip()
            if code and name:
                _fund_name_cache[code] = name
        print(f"基金名称缓存加载完成，共 {len(_fund_name_cache)} 只")
    except Exception as e:
        print(f"基金名称缓存加载失败: {e}")

def _get_fund_name(fund_code: str) -> str:
    """优先从缓存获取基金名称，缓存没有则返回代码本身"""
    return _fund_name_cache.get(fund_code.strip(), fund_code)

@app.on_event("startup")
async def startup():
    """服务启动时预加载基金名称缓存"""
    import threading
    # 在后台线程加载，避免阻塞启动
    threading.Thread(target=_load_fund_name_cache, daemon=True).start()

@app.get("/api/fund/{fund_code}", response_model=FundInfo)
async def get_fund_info(fund_code: str):
    """获取单只基金的最新信息"""
    try:
        # 获取基金最新净值数据
        fund_nav = ak.fund_open_fund_info_em(symbol=fund_code)
        if fund_nav.empty:
            raise HTTPException(status_code=404, detail=f"未找到基金代码：{fund_code}")

        latest_data = fund_nav.iloc[-1]
        nav = float(latest_data['单位净值'])
        nav_date = str(latest_data['净值日期'])

        # 从缓存获取基金名称（O(1) 查找）
        fund_name = _get_fund_name(fund_code)

        return FundInfo(
            fund_code=fund_code,
            fund_name=fund_name,
            fund_type=None,
            fund_company=None,
            latest_nav=nav,
            latest_nav_date=nav_date,
            day_growth=None,
            last_1_month=None,
            last_3_month=None,
            last_6_month=None,
            last_1_year=None
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"获取基金数据失败：{str(e)}")

async def _fetch_one_fund(fund_code: str):
    """查询单只基金，返回 (code, FundInfo) 或 None"""
    try:
        fund_nav = ak.fund_open_fund_info_em(symbol=fund_code)
        if fund_nav.empty:
            return None
        latest_data = fund_nav.iloc[-1]
        nav = float(latest_data['单位净值'])
        nav_date = str(latest_data['净值日期'])
        fund_name = _get_fund_name(fund_code)
        return (fund_code, FundInfo(
            fund_code=fund_code,
            fund_name=fund_name,
            fund_type=None,
            fund_company=None,
            latest_nav=nav,
            latest_nav_date=nav_date,
            day_growth=None,
            last_1_month=None,
            last_3_month=None,
            last_6_month=None,
            last_1_year=None
        ))
    except Exception as e:
        print(f"获取基金 {fund_code} 失败：{str(e)}")
        return None

@app.post("/api/fund/batch", response_model=Dict[str, FundInfo])
async def get_fund_batch(request: FundBatchRequest):
    """批量获取多只基金的最新信息（并发查询）"""
    # 使用 asyncio.gather 并发查询，同时限制最大并发数为 5
    semaphore = asyncio.Semaphore(5)

    async def _limited_fetch(code: str):
        async with semaphore:
            return await _fetch_one_fund(code)

    tasks = [_limited_fetch(code) for code in request.fund_codes]
    results_list = await asyncio.gather(*tasks)

    results = {}
    for item in results_list:
        if item is not None:
            code, info = item
            results[code] = info

    if not results:
        raise HTTPException(status_code=500, detail="所有基金数据获取失败")

    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
