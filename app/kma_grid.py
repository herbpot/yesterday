# kma_grid.py
import math

def latlon_to_xy(lat: float, lon: float):
    RE = 6371.00877     # 지구 반경(km)
    GRID = 5.0          # 격자 간격(km)
    SLAT1 = 30.0        # 표준위도1
    SLAT2 = 60.0        # 표준위도2
    OLON = 126.0        # 기준경도
    OLAT = 38.0         # 기준위도
    XO = 43             # 기준점 X좌표
    YO = 136            # 기준점 Y좌표

    DEGRAD = math.pi / 180.0
    re = RE / GRID
    slat1 = SLAT1 * DEGRAD
    slat2 = SLAT2 * DEGRAD
    olon  = OLON  * DEGRAD
    olat  = OLAT  * DEGRAD

    sn = math.tan(math.pi*0.25 + slat2*0.5) / math.tan(math.pi*0.25 + slat1*0.5)
    sn = math.log(math.cos(slat1)/math.cos(slat2)) / math.log(sn)
    sf = math.tan(math.pi*0.25 + slat1*0.5)
    sf = (sf**sn)*math.cos(slat1)/sn
    ro = math.tan(math.pi*0.25 + olat*0.5)
    ro = re*sf/(ro**sn)

    ra = math.tan(math.pi*0.25 + lat*DEGRAD*0.5)
    ra = re*sf/(ra**sn)
    theta = lon*DEGRAD - olon
    if theta > math.pi:  theta -= 2.0*math.pi
    if theta < -math.pi: theta += 2.0*math.pi
    theta *= sn

    x = int(ra*math.sin(theta) + XO + 0.5)
    y = int(ro - ra*math.cos(theta) + YO + 0.5)
    return x, y
