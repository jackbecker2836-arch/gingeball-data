class Court:
    """
    Court class represents the basketball court as a graph of keypoints
        and edges connecting them.

    Attributes:
        kp_edge_list: List of edges connecting keypoints
        kp_coordinates: Dictionary of keypoints and their coordinates
    """
    def __init__(self, width=94, height=50):
        self.kp_edge_list = self.build_edge_list()
        self.kp_coordinates = self.build_coordinates(width, height)

    def build_coordinates(self, width=94, height=50):
        # assign coordinates for all keypoints in a top-down court view
        
        # for 3 pt line, we can calculate the radius of the arc using 
        #   dimensions linked below
        # https://www.recunlimited.com/blog/diagrams-basketball-courts/

        # ### Building Ratios with standard 94 x 50 court ###
        # standard NBA measurements (horizontals)
        # ratios with height
        top_arc = 3 
        bottom_arc = 50-3
        top_paint = (50 - 3 - 3 - 16)//2 + 3
        bottom_paint = 50 - top_paint - 3

        # standard NBA measurements (verticals)
        # ratios with width
        left_start_arc = 14
        left_max_arc = 23+4
        left_ft_line = 19
        left_basket = 4
        left_inside = 28
        right_start_arc = 94 - left_start_arc
        right_max_arc = 94 - left_max_arc
        right_ft_line = 94 - left_ft_line
        right_basket = 94 - left_basket
        right_inside = 94 - left_inside

        coords = {
            # left line
            0: (0, 0), # tl corner
            1: (0, top_arc/50 * height), # tl 3p start
            2: (0, top_paint/50 * height), # tl paint top
            3: (0, bottom_paint/50 * height), # tl paint bottom

            # left paint
            6: (left_basket/94 * width, height/2), # center of basket
            9: (left_ft_line/94 * width, top_paint/50 * height), # top throw line
            10: (left_ft_line/94 * width, height/2), # center of throw line
            11: (left_ft_line/94 * width, bottom_paint/50 * height), # bottom throw line

            # left arc
            7: (left_start_arc/94 * width, top_arc/50 * height), # top of arc
            13: (left_max_arc/94 * width, height/2), # top of arc
            8: (left_start_arc/94 * width, bottom_arc/50 * height), # bottom of arc

            # top line
            12: (left_inside/94 * width, 0), # left inside
            15: (width/2, 0), # center
            18: (right_inside/94 * width, 0), # right inside

            # right paint
            26: (right_basket/94 * width, height/2), # center of basket
            21: (right_ft_line/94 * width, top_paint/50 * height), # top throw line
            22: (right_ft_line/94 * width, height/2), # center of throw line
            23: (right_ft_line/94 * width, bottom_paint/50 * height), # bottom throw line
            
            # right arc
            24: (right_start_arc/94 * width, top_arc/50 * height), # top of arc
            19: (right_max_arc/94 * width, height/2), # top of arc
            25: (right_start_arc/94 * width, bottom_arc/50 * height), # bottom of arc

            # right line
            27: (width, 0),
            28: (width, top_arc/50 * height),
            29: (width, top_paint/50 * height),
            30: (width, bottom_paint/50 * height),
            31: (width, bottom_arc/50 * height),

        }
        return coords

    def build_edge_list(self):
        return [

        ### right side of court ###

        # upper court boundry 
        (18, 27), # 27 is top right corner

        # right court boundry
        (27, 29),
        (27, 28),
        (29, 30),
        (30, 31),

        # three point arc
        (28, 24),
        (24, 19),
        (19, 25), # 19 is top of key/circle
        (25, 31),

        # the paint
        (29, 21),
        (21, 23), # free throw line
        (22, 22), # center of ft liner
        (26, 26), # under basket
        (23, 30),
        (30, 29),

        ### left side of court ###

        # upper court boundry
        (0, 12), # 0 is top left corner

        # left court boundry
        (0, 2),
        (0, 1),
        (2, 3),

        # three point arc
        (1, 7),
        (7, 13), # 13 is top of key/circle
        (13, 8),

        # the paint
        (2, 9),
        (9, 11), # free throw line
        (10, 10), # center of ft line
        (6, 6), # under basket
        (11, 3),
        (3, 2),

        # center of court
        (12, 15),
        (15, 18),


    ]

if __name__ == "__main__":
    court = Court()
    court.build_coordinates()