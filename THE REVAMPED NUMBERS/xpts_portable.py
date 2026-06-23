"""Portable xPTS scorer — fit on 6450 games / 1,092,382 FG attempts (AUC 0.6316).
xpts(shot) = p_make * value.  Inputs: dist(ft), value(2|3), shot_type(jump shot|layup|dunk|hook shot)."""
import math
C={'dist': -0.062961, 'dist2': 0.000407, 'is3': 0.334592, 'layup': -0.039801, 'dunk': 1.668014, 'hook': -0.134335}
B=0.438348
FT_RATE=0.779
def p_make(dist,value,shot_type):
    z=B+C["dist"]*dist+C["dist2"]*dist*dist+C["is3"]*(value==3)
    z+=C["layup"]*(shot_type=="layup")+C["dunk"]*(shot_type=="dunk")+C["hook"]*(shot_type=="hook shot")
    return 1/(1+math.exp(-z))
def xpts(dist,value,shot_type): return p_make(dist,value,shot_type)*value
