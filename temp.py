import pandas as pd
from pathlib import Path

# -------- 1) 파일 경로 --------
EXCEL_PATH = Path(r"c:\Users\user\Downloads\행정구역별_위경도_좌표.xlsx")
CSV_PATH   = Path(r"c:\Users\user\Downloads\ACMM_ADMSECT.CSV")

# -------- 2) 자료 읽기 --------
# ① 엑셀 : 필요열만 남기고 이름 통일
df_coord = (
    pd.read_excel(EXCEL_PATH, engine="openpyxl")
      .rename(columns={
          "행정구역코드":"ADM_CD",   # 실제 열 이름과 다르면 수정
          "위도":"LAT",
          "경도":"LON"
      })[["ADM_CD", "LAT", "LON"]]
      .dropna(subset=["ADM_CD","LAT","LON"])
)

# ② CSV(행정구역 메타) : 코드 열만 추출
df_meta = (
    pd.read_csv(CSV_PATH, encoding="cp949")   # EUC-KR 계열이면 cp949
      .rename(columns={
          "ADM_SECT_CD":"ADM_CD"  # 실제 열 이름과 다르면 수정
      })[["ADM_CD"]]
      .drop_duplicates()
)

# -------- 3) 병합 --------
df = pd.merge(df_meta, df_coord, on="ADM_CD", how="left")

# -------- 4) 중복 코드 처리 --------
#   (위·경도가 동일하면 하나만, 다르면 평균)
dupes = df[df.duplicated("ADM_CD", keep=False)]
if not dupes.empty:
    df = (df.groupby("ADM_CD", as_index=False)
             .agg({"LAT":"mean", "LON":"mean"}))

# -------- 5) 저장 및 확인 --------
OUT_PATH = Path("./area_code_centroid.csv")
df.to_csv(OUT_PATH, index=False, encoding="utf-8-sig")

print("✅ 행정코드 수 :", len(df))
print(df.head(10))     # 미리보기
print(f"[파일 저장] {OUT_PATH}")
