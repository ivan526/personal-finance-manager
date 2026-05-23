from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import akshare as ak
import requests
import re
from typing import List, Dict, Optional

app = FastAPI(title="FinSpace 基金数据接口", description="为FinSpace个人理财系统提供基金数据支持")

# 配置CORS，允许本地所有源访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
        
        # 获取基金名称，使用官方接口 fund_name_em
        fund_name = fund_code
        try:
            # 获取所有基金名称列表
            fund_list = ak.fund_name_em()
            # 查找对应基金代码
            fund_info = fund_list[fund_list['基金代码'] == fund_code.strip()]
            if len(fund_info) > 0:
                fund_name = fund_info.iloc[0]['基金简称']
                print(f"找到基金: {fund_code} -> {fund_name}")
        except Exception as e:
            print(f"获取基金名称失败: {str(e)}")
            import traceback
            traceback.print_exc()
        
        return FundInfo(
            fund_code=fund_code,
            fund_name=str(fund_name),
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
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"获取基金数据失败：{str(e)}")

@app.post("/api/fund/batch", response_model=Dict[str, FundInfo])
async def get_fund_batch(request: FundBatchRequest):
    """批量获取多只基金的最新信息"""
    results = {}
    for fund_code in request.fund_codes:
        try:
            fund_info = await get_fund_info(fund_code)
            results[fund_code] = fund_info
        except Exception as e:
            print(f"获取基金 {fund_code} 失败：{str(e)}")
            continue
    
    if not results:
        raise HTTPException(status_code=500, detail="所有基金数据获取失败")
    
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
