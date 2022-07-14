import os

path="html"
def rename (path):
  filenames = os.listdir(path)
  for filename in filenames:
    print(filename)
    #filename2 = filename.encode('gbk').decode('utf8')
    lowerfilename = filename2.lower()
    file = os.path.join(path,filename)
    new_file = os.path.join(path,lowerfilename)
    if os.path.isdir(file):
      rename(file)
    else:
      os.rename(file,new_file)
rename(path)