# FinSpace 基金数据接口服务

## 功能说明
为FinSpace个人理财系统提供基金数据获取服务，基于AkShare实现。

## 安装依赖
```bash
pip install -r requirements.txt
```

## 运行服务
```bash
python main.py
```
服务默认运行在 http://localhost:8000

## API接口

### 1. 获取单只基金信息
```http
GET /api/fund/{fund_code}
```

#### 响应示例：
```json
{
  "fund_code": "000001",
  "fund_name": "华夏成长混合",
  "fund_type": "混合型",
  "fund_company": "华夏基金管理有限公司",
  "latest_nav": 1.2345,
  "latest_nav_date": "2026-05-20",
  "day_growth": 0.0123,
  "last_1_month": 0.0567,
  "last_3_month": 0.1234,
  "last_6_month": 0.2345,
  "last_1_year": 0.3456
}
```

### 2. 批量获取基金信息
```http
POST /api/fund/batch
Content-Type: application/json

{
  "fund_codes": ["000001", "000002"]
}
```

#### 响应示例：
```json
{
  "000001": { ... },
  "000002": { ... }
}
```

## 使用说明
1. 先启动后端服务
2. 前端投资页面点击「更新基金净值」按钮，会自动调用接口更新所有持仓基金的最新净值
3. 后端接口会自动通过AkShare从东方财富网获取最新的基金数据
